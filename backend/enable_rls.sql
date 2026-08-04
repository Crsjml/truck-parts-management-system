ALTER PUBLICATION supabase_realtime ADD TABLE "AuthLog";
ALTER TABLE "AuthLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view auth logs" ON "AuthLog"
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'role') = 'admin' OR 
  EXISTS (SELECT 1 FROM "StaffRole" WHERE email = (auth.jwt() ->> 'email'))
);
