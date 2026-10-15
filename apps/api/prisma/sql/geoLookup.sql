-- Point → municipality and region (C6, ADR-006). Functions are schema-qualified: `?schema=app` leaves `extensions`
-- off the search path. Tie-break `order by m.id`: the GURS polygons of Ivančna Gorica and Žužemberk overlap by
-- about 330 m². No row means the point is outside Slovenia.
-- @param {Float} $1:lat
-- @param {Float} $2:lng
select m.id as municipality_id, m.slug as municipality_slug, r.id as region_id, r.slug as region_slug
from app.municipalities m join app.regions r on r.id = m.region_id
where extensions.st_covers(m.geom, extensions.st_setsrid(extensions.st_makepoint($2, $1), 4326)::extensions.geography)
order by m.id limit 1;
