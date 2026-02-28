export type ExtractedPropsEvents = {
  events: Record<string, (payload: unknown) => void>
  props: Record<string, unknown>
}

export function extractPropsAndEvents(vdom: { props: Record<string, unknown> }): ExtractedPropsEvents {
  const { on: events = {}, ...props } = vdom.props as any
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete (props as any).key
  return { props, events }
}
