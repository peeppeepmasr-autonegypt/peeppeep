-- Probe: is SQLite JSON1 available in D1? The admin write path depends on it,
-- because a single json_set() statement is atomic, while read-modify-write of a
-- JSON text column from two admin sessions is not.
SELECT
  json_set('{"a":1}', '$."b"', 'x') AS patched,
  json_extract(custom_data, '$.sec_auto_exterior.wheels') AS wheels,
  length(custom_data) AS bag_bytes
FROM businesses
WHERE id = 'biz_x5';
