import PropTypes from 'prop-types'
import React from 'react'
import EventCell from './EventCell'
import { isSelected } from './utils/selection'

/* eslint-disable react/prop-types */
export default {
  propTypes: {
    slotMetrics: PropTypes.object.isRequired,

    selected: PropTypes.object,
    isAllDay: PropTypes.bool,

    accessors: PropTypes.object.isRequired,
    localizer: PropTypes.object.isRequired,
    components: PropTypes.object.isRequired,
    getters: PropTypes.object.isRequired,

    onSelect: PropTypes.func,
    onDoubleClick: PropTypes.func,
  },

  defaultProps: {
    segments: [],
    selected: {},
  },

  renderEvent(props, event) {
    let {
      selected,
      isAllDay,
      components,
      accessors,
      getters,
      onSelect,
      onDoubleClick,
      slotMetrics,
    } = props

    let continuesPrior = slotMetrics.startsBefore(accessors.start(event))
    let continuesAfter = slotMetrics.endsAfter(accessors.end(event))

    return (
      <EventCell
        event={event}
        getters={getters}
        accessors={accessors}
        components={components}
        onSelect={onSelect}
        onDoubleClick={onDoubleClick}
        continuesPrior={continuesPrior}
        continuesAfter={continuesAfter}
        selected={isSelected(event, selected)}
        isAllDay={isAllDay}
      />
    )
  },

  renderSpan(slots, len, key, content = ' ') {
    let per = Math.abs(len) / slots * 100 + '%'

    return (
      <div
        key={key}
        className="rbc-row-segment"
        // IE10/11 need max-width. flex-basis doesn't respect box-sizing
        style={{ WebkitFlexBasis: per, flexBasis: per, maxWidth: per }}
      >
        {content}
      </div>
    )
  },
}
