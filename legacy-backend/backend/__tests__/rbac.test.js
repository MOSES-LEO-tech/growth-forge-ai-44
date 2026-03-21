"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const rbac_middleware_1 = require("../src/middleware/rbac.middleware");
describe('RBAC Middleware', () => {
    let mockReq;
    let mockRes;
    let nextFunction;
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
            const middleware = (0, rbac_middleware_1.requireRole)(['admin', 'teacher']);
            middleware(mockReq, mockRes, nextFunction);
            expect(nextFunction).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });
        it('should deny access for unauthorized role', () => {
            // @ts-ignore
            mockReq.user = { id: 1, role: 'student' };
            const middleware = (0, rbac_middleware_1.requireRole)(['admin', 'teacher']);
            middleware(mockReq, mockRes, nextFunction);
            expect(nextFunction).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
        it('should deny access when no role is present', () => {
            // @ts-ignore
            mockReq.user = { id: 1 };
            const middleware = (0, rbac_middleware_1.requireRole)(['admin']);
            middleware(mockReq, mockRes, nextFunction);
            expect(nextFunction).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
        });
        it('should deny access when no user is present', () => {
            const middleware = (0, rbac_middleware_1.requireRole)(['admin']);
            middleware(mockReq, mockRes, nextFunction);
            expect(nextFunction).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
        });
    });
    describe('requireSchoolMember', () => {
        it('should allow admin to access any school', () => __awaiter(void 0, void 0, void 0, function* () {
            // @ts-ignore
            mockReq.user = { id: 1, role: 'admin', school_id: 1 };
            mockReq.params = { schoolId: '2' };
            yield (0, rbac_middleware_1.requireSchoolMember)(mockReq, mockRes, nextFunction);
            expect(nextFunction).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        }));
        it('should allow school member to access their school', () => __awaiter(void 0, void 0, void 0, function* () {
            // @ts-ignore
            mockReq.user = { id: 1, role: 'teacher', school_id: 5 };
            mockReq.params = { schoolId: '5' };
            yield (0, rbac_middleware_1.requireSchoolMember)(mockReq, mockRes, nextFunction);
            expect(nextFunction).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        }));
        it('should deny access to different school', () => __awaiter(void 0, void 0, void 0, function* () {
            // @ts-ignore
            mockReq.user = { id: 1, role: 'teacher', school_id: 5 };
            mockReq.params = { schoolId: '3' };
            yield (0, rbac_middleware_1.requireSchoolMember)(mockReq, mockRes, nextFunction);
            expect(nextFunction).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
        }));
        it('should deny access when user has no school', () => __awaiter(void 0, void 0, void 0, function* () {
            // @ts-ignore
            mockReq.user = { id: 1, role: 'student', school_id: null };
            mockReq.params = { schoolId: '1' };
            yield (0, rbac_middleware_1.requireSchoolMember)(mockReq, mockRes, nextFunction);
            expect(nextFunction).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
        }));
    });
});
