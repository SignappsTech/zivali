import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode, type TdHTMLAttributes } from 'react';

type El = ReactElement<TdHTMLAttributes<HTMLElement>>;

const elements = (node: ReactNode) => Children.toArray(node).filter(isValidElement) as El[];

const text = (node: ReactNode): string =>
	Children.toArray(node)
		.map((n) => (isValidElement<{ children?: ReactNode }>(n) ? text(n.props.children) : String(n)))
		.join('');

const tdClass = [
	'border-b-2 border-border px-5 py-4 align-top wrap-anywhere first:font-bold',
	'cards:block cards:border-0 cards:p-0 cards:nth-[n+3]:mt-1',
	'cards:first:mb-1.5 cards:first:font-display cards:first:text-lg/6.5 cards:first:tracking-[-0.01em]',
].join(' ');

/**
 * Every legal table (TASK-114.19, wireframe M-legal-table v1): a filled header row, a 30 % bold label column, 2 px row
 * dividers, top-aligned cells. On narrow screens each row is a card: the label is its heading and the other cells sit
 * under it, as "column: value" lines when there are more than two columns. The legal MDX wraps its literal <table>
 * (which mdx-components.tsx cannot reach) in <LegalTable>. Explicit ARIA roles keep the table semantics that
 * display:block drops in some browsers, and the hidden header row keeps the header association.
 */
export function LegalTable({ children }: { children: ReactNode }) {
	const [table] = elements(children);
	const [thead, tbody] = elements(table.props.children);
	const [headRow] = elements(thead.props.children);
	const head = elements(headRow.props.children);
	const labels = head.map((th) => text(th.props.children));
	return cloneElement(
		table,
		{
			role: 'table',
			className: 'mt-4 w-full table-fixed border-separate border-spacing-0 text-left text-base/6.5 cards:block',
		},
		cloneElement(
			thead,
			{ role: 'rowgroup', className: 'cards:sr-only' },
			cloneElement(
				headRow,
				{ role: 'row' },
				...head.map((th) =>
					cloneElement(th, {
						role: 'columnheader',
						scope: 'col',
						className:
							'bg-muted px-5 py-3 align-middle font-bold first:w-[30%] first:rounded-tl-row last:rounded-tr-row',
					}),
				),
			),
		),
		cloneElement(
			tbody,
			{ role: 'rowgroup', className: 'cards:grid cards:gap-3' },
			...elements(tbody.props.children).map((tr) =>
				cloneElement(
					tr,
					{ role: 'row', className: 'cards:block cards:rounded-card cards:bg-card cards:px-5 cards:pt-4.5 cards:pb-5' },
					...elements(tr.props.children).map((td, i) =>
						cloneElement(
							td,
							{ role: i ? 'cell' : 'rowheader', className: tdClass },
							labels.length > 2 && i > 0 ? (
								<span aria-hidden="true" className="hidden font-bold cards:inline">
									{labels[i]}:{' '}
								</span>
							) : null,
							td.props.children,
						),
					),
				),
			),
		),
	);
}
