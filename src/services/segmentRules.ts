import dayjs from 'dayjs';

export type Rule =
	| { field: 'spend' | 'visits'; op: '>' | '>=' | '<' | '<=' | '==' | '!='; value: number }
	| { field: 'inactive_days'; op: '>' | '>=' | '<' | '<=' | '=='; value: number };

export type RuleGroup = { and?: Array<Rule | RuleGroup>; or?: Array<Rule | RuleGroup> };

export function evaluateRule(customer: any, rule: Rule | RuleGroup): boolean {
	if ('field' in rule) {
		if (rule.field === 'inactive_days') {
			const last = customer.last_active ? dayjs(customer.last_active) : null;
			const days = last ? dayjs().diff(last, 'day') : Number.MAX_SAFE_INTEGER;
			return compare(days, rule.op, rule.value);
		}
		const actual = customer[rule.field] ?? 0;
		return compare(actual, rule.op, rule.value);
	}
	if (rule.and) return rule.and.every((r) => evaluateRule(customer, r as any));
	if (rule.or) return rule.or.some((r) => evaluateRule(customer, r as any));
	return true;
}

function compare(a: number, op: string, b: number): boolean {
	switch (op) {
		case '>': return a > b;
		case '>=': return a >= b;
		case '<': return a < b;
		case '<=': return a <= b;
		case '==': return a === b;
		case '!=': return a !== b;
		default: return false;
	}
}
