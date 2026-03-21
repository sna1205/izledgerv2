UPDATE "trade_shares"
SET "share_settings" = jsonb_build_object(
  'version',
  1,
  'data',
  jsonb_build_object(
    'showPnl', COALESCE(("share_settings" ->> 'showPnl')::boolean, true),
    'showAccountName', COALESCE(("share_settings" ->> 'showAccountName')::boolean, false),
    'showNotes', COALESCE(("share_settings" ->> 'showNotes')::boolean, true),
    'showScreenshots', COALESCE(("share_settings" ->> 'showScreenshots')::boolean, true),
    'showExactPrices', COALESCE(("share_settings" ->> 'showExactPrices')::boolean, true)
  )
)
WHERE jsonb_typeof("share_settings") = 'object'
  AND NOT ("share_settings" ? 'version');

UPDATE "trade_shares"
SET "snapshot" = jsonb_build_object(
  'version',
  1,
  'data',
  "snapshot"
)
WHERE jsonb_typeof("snapshot") = 'object'
  AND NOT ("snapshot" ? 'version');
