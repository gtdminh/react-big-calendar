import cn from 'classnames'
import React from 'react'

/* eslint-disable react/prop-types */
function TimeGridEvent({
  style,
  className,
  event,
  accessors,
  isRtl,
  selected,
  label,
  continuesEarlier,
  continuesLater,
  eventPropGetter,
  eventComponent: Event,
  ...props
}) {
  let title = accessors.title(event)
  let tooltip = accessors.tooltip(event)
  let end = accessors.end(event)
  let start = accessors.start(event)

  let userProps = eventPropGetter(event, start, end, selected)

  let { height, top, width, xOffset } = style

  return (
    <div
      {...props}
      style={{
        ...userProps.style,
        top: `${top}%`,
        height: `${height}%`,
        [isRtl ? 'right' : 'left']: `${Math.max(0, xOffset)}%`,
        width: `${width}%`,
      }}
      title={
        tooltip
          ? (typeof label === 'string' ? label + ': ' : '') + tooltip
          : undefined
      }
      className={cn('rbc-event', className, userProps.className, {
        'rbc-selected': selected,
        'rbc-event-continues-earlier': continuesEarlier,
        'rbc-event-continues-later': continuesLater,
      })}
    >
      <div className="rbc-event-label">{label}</div>
      <div className="rbc-event-content">
        {Event ? <Event event={event} title={title} /> : title}
      </div>
    </div>
  )
}

export default TimeGridEvent
