// Public surface of the reports area; the DAO stays private to the area.
export {
	default as ReportsDomain,
	type CreatedReport,
	type ManagerView,
	type NewReport,
	type ReportView,
} from './reports.domain.ts';
export { default as ReportsMapper } from './reports.mapper.ts';
