# Database schema

## `farms`
- `id`: integer primary key
- `name`: required farm display name
- `crop`: primary crop label
- `location`: optional village/district text
- `created_at`: timestamp

## `scans`
- `id`: integer primary key
- `filename`: server-generated uploaded image filename
- `predicted_class`: output class from the trained classifier
- `confidence`: maximum softmax score (not necessarily calibrated)
- `model_version`: inference model identifier
- `farm_id`: nullable foreign key to `farms.id` (currently reserved for farm linking)
- `created_at`: timestamp
- `note`: decision-support limitation notice

## Production hardening
This educational starter does not implement authentication, migrations, audit trails, or scan-to-farm assignment. Add those before multi-user/public deployment. Store credentials in environment variables, not source control.
