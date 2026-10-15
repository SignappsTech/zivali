// Public surface of the reports area; the DAO stays private to the area.
export {
	default as ReportsDomain,
	type CreatedReport,
	type ManagerView,
	type NewReport,
	type ReportView,
} from './reports.domain.ts';
export { default as ManageDomain } from './manage.domain.ts';
export { default as SearchDomain, type MapInput, type SearchInput } from './search.domain.ts';
export { default as ReportsMapper } from './reports.mapper.ts';
