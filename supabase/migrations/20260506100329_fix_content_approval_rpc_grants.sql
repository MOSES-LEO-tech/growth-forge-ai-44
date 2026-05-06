GRANT EXECUTE ON FUNCTION public.approve_student_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_student_project(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_student_media_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_student_media_event(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_student_achievement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_student_achievement(uuid, text) TO authenticated;
