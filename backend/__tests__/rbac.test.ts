import { Request, Response, NextFunction } from 'express';
import { requireRole, requireSchoolMember } from '../src/middleware/rbac.middleware';

describe('RBAC Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        mockReq = {};
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        nextFunction = jest.fn();
    });

    describe('requireRole', () => {
        it('should allow access for authorized role', () => {
            // @ts-ignore
            mockReq.user = { id: 1, role: 'admin' };

            const middleware = requireRole(['admin', 'teacher']);
            middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should deny access for unauthorized role', () => {
            // @ts-ignore
            mockReq.user = { id: 1, role: 'student' };

            const middleware = requireRole(['admin', 'teacher']);
            middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('should deny access when no role is present', () => {
            // @ts-ignore
            mockReq.user = { id: 1 };

            const middleware = requireRole(['admin']);
            middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
        });

        it('should deny access when no user is present', () => {
            const middleware = requireRole(['admin']);
            middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
        });
    });

    describe('requireSchoolMember', () => {
        it('should allow admin to access any school', async () => {
            // @ts-ignore
            mockReq.user = { id: 1, role: 'admin', school_id: 1 };
            mockReq.params = { schoolId: '2' };

            await requireSchoolMember(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should allow school member to access their school', async () => {
            // @ts-ignore
            mockReq.user = { id: 1, role: 'teacher', school_id: 5 };
            mockReq.params = { schoolId: '5' };

            await requireSchoolMember(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should deny access to different school', async () => {
            // @ts-ignore
            mockReq.user = { id: 1, role: 'teacher', school_id: 5 };
            mockReq.params = { schoolId: '3' };

            await requireSchoolMember(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('should deny access when user has no school', async () => {
            // @ts-ignore
            mockReq.user = { id: 1, role: 'student', school_id: null };
            mockReq.params = { schoolId: '1' };

            await requireSchoolMember(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
    });
});
