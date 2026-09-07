-- Begränsar bildlagringen (observation- och loggboksbilder) till faktiska
-- bildformat på databasnivå, som ett skyddsnät utöver kontrollen i appen
-- (försvar på flera nivåer mot att någon laddar upp en skadlig fil som "bild").
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'observation-images';
