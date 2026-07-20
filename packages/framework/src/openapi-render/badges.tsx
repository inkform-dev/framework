export function RequiredBadge() {
  return <span className="fw-param-required">required</span>;
}

export function DeprecatedBadge() {
  return <span className="fw-param-deprecated">deprecated</span>;
}

export function MethodPill({ method }: { method: string }) {
  return <span className={`fw-method-pill fw-method-${method.toLowerCase()}`}>{method.toUpperCase()}</span>;
}
