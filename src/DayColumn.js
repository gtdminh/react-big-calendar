import PropTypes from 'prop-types'
import React from 'react'
import { findDOMNode } from 'react-dom'
import cn from 'classnames'

import Selection, { getBoundsForNode, isEvent } from './Selection'
import dates from './utils/dates'
import * as TimeSlotUtils from './utils/TimeSlots'
import { isSelected } from './utils/selection'
import localizer from './localizer'

import { notify } from './utils/helpers'
import { dateFormat } from './utils/propTypes'
import * as DayEventLayout from './utils/DayEventLayout'
import TimeSlotGroup from './TimeSlotGroup'
import TimeGridEvent from './TimeGridEvent'

class DayColumn extends React.Component {
  static propTypes = {
    events: PropTypes.array.isRequired,
    step: PropTypes.number.isRequired,
    date: PropTypes.instanceOf(Date).isRequired,
    min: PropTypes.instanceOf(Date).isRequired,
    max: PropTypes.instanceOf(Date).isRequired,
    getNow: PropTypes.func.isRequired,

    rtl: PropTypes.bool,

    selectRangeFormat: dateFormat,

    accessors: PropTypes.object.isRequired,
    components: PropTypes.object.isRequired,
    getters: PropTypes.object.isRequired,
    formats: PropTypes.shape({
      eventTimeRangeFormat: dateFormat,
      eventTimeRangeStartFormat: dateFormat,
      eventTimeRangeEndFormat: dateFormat,
    }).isRequired,

    showMultiDayTimes: PropTypes.bool,
    culture: PropTypes.string,
    timeslots: PropTypes.number,
    messages: PropTypes.object,

    selected: PropTypes.object,
    selectable: PropTypes.oneOf([true, false, 'ignoreEvents']),
    eventOffset: PropTypes.number,
    longPressThreshold: PropTypes.number,

    onSelecting: PropTypes.func,
    onSelectSlot: PropTypes.func.isRequired,
    onSelectEvent: PropTypes.func.isRequired,
    onDoubleClickEvent: PropTypes.func.isRequired,

    className: PropTypes.string,
    dragThroughEvents: PropTypes.bool,
    resource: PropTypes.any,
  }

  static defaultProps = {
    dragThroughEvents: true,
    timeslots: 2,
  }

  state = { selecting: false }

  constructor(...args) {
    super(...args)

    this.slotMetrics = TimeSlotUtils.getSlotMetrics(this.props)
  }

  componentDidMount() {
    this.props.selectable && this._selectable()
  }

  componentWillUnmount() {
    this._teardownSelectable()
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.selectable && !this.props.selectable) this._selectable()
    if (!nextProps.selectable && this.props.selectable)
      this._teardownSelectable()

    this.slotMetrics = this.slotMetrics.update(nextProps)
  }

  render() {
    const {
      max,
      rtl,
      date,
      getNow,
      formats,
      culture,
      resource,
      accessors,
      messages,
      getters: { dayProp, ...getters },
      components: { eventContainerWrapper: EventContainer, ...components },
    } = this.props

    let { slotMetrics } = this
    let { selecting, top, height, startDate, endDate } = this.state

    let selectDates = { start: startDate, end: endDate }

    const { className, style } = dayProp(max)
    const current = getNow()

    return (
      <div
        style={style}
        className={cn(
          className,
          'rbc-day-slot',
          'rbc-time-column',
          selecting && 'rbc-slot-selecting',
          dates.eq(date, current, 'day') && 'rbc-today'
        )}
      >
        {slotMetrics.groups.map((grp, idx) => (
          <TimeSlotGroup
            key={idx}
            group={grp}
            resource={resource}
            getters={getters}
            components={components}
          />
        ))}
        <EventContainer
          formats={formats}
          culture={culture}
          messages={messages}
          resource={resource}
          accessors={accessors}
          getters={getters}
          components={components}
          slotMetrics={slotMetrics}
          localizer={localizer}
        >
          <div className={cn('rbc-events-container', rtl && 'rtl')}>
            {this.renderEvents()}
          </div>
        </EventContainer>

        {selecting && (
          <div className="rbc-slot-selection" style={{ top, height }}>
            <span>
              {localizer.format(
                selectDates,
                formats.selectRangeFormat,
                culture
              )}
            </span>
          </div>
        )}
      </div>
    )
  }

  renderEvents = () => {
    let {
      culture,
      events,
      messages,
      rtl: isRtl,
      selected,
      accessors,
      formats,
      getters,
      components: { eventWrapper: EventWrapper, event: Event },
    } = this.props

    const { slotMetrics } = this

    let styledEvents = DayEventLayout.getStyledEvents({
      events,
      accessors,
      slotMetrics,
    })

    return styledEvents.map(({ event, style }, idx) => {
      let end = accessors.end(event)
      let start = accessors.start(event)
      let format = formats.eventTimeRangeFormat
      let label

      const startsBeforeDay = slotMetrics.startsBeforeDay(start)
      const startsAfterDay = slotMetrics.startsAfterDay(end)

      if (startsBeforeDay) format = formats.eventTimeRangeEndFormat
      else if (startsAfterDay) format = formats.eventTimeRangeStartFormat

      if (startsBeforeDay && startsAfterDay) label = messages.allDay
      else label = localizer.format({ start, end }, format, culture)

      let continuesEarlier = startsBeforeDay || slotMetrics.startsBefore(start)
      let continuesLater = startsAfterDay || slotMetrics.startsAfter(end)

      return (
        <EventWrapper
          type="time"
          event={event}
          formats={formats}
          culture={culture}
          slotMetrics={slotMetrics}
          getters={getters}
          messages={messages}
          accessors={accessors}
          continuesEarlier={continuesEarlier}
          continuesLater={continuesLater}
        >
          <TimeGridEvent
            style={style}
            event={event}
            label={label}
            key={'evt_' + idx}
            getters={getters}
            isRtl={isRtl}
            eventComponent={Event}
            eventPropGetter={getters.eventProp}
            continuesEarlier={continuesEarlier}
            continuesLater={continuesLater}
            accessors={accessors}
            selected={isSelected(event, selected)}
            onClick={e => this._select(event, e)}
            onDoubleClick={e => this._doubleClick(event, e)}
          />
        </EventWrapper>
      )
    })
  }

  _selectable = () => {
    let node = findDOMNode(this)
    let selector = (this._selector = new Selection(() => findDOMNode(this), {
      longPressThreshold: this.props.longPressThreshold,
    }))

    let maybeSelect = box => {
      let onSelecting = this.props.onSelecting
      let current = this.state || {}
      let state = selectionState(box)
      let { startDate: start, endDate: end } = state

      if (onSelecting) {
        if (
          (dates.eq(current.startDate, start, 'minutes') &&
            dates.eq(current.endDate, end, 'minutes')) ||
          onSelecting({ start, end }) === false
        )
          return
      }

      if (
        this.state.start !== state.start ||
        this.state.end !== state.end ||
        this.state.selecting !== state.selecting
      ) {
        this.setState(state)
      }
    }

    let selectionState = ({ y }) => {
      let { top, bottom } = getBoundsForNode(node)

      let range = Math.abs(top - bottom)
      let currentSlot = this.slotMetrics.closestSlotToPosition(
        (y - top) / range
      )

      if (!this.state.selecting) this._initialSlot = currentSlot

      let initialSlot = this._initialSlot
      if (initialSlot === currentSlot)
        currentSlot = this.slotMetrics.nextSlot(initialSlot)

      const selectRange = this.slotMetrics.getRange(
        dates.min(initialSlot, currentSlot),
        dates.max(initialSlot, currentSlot)
      )

      return {
        ...selectRange,
        selecting: true,

        top: `${selectRange.top}%`,
        height: `${selectRange.height}%`,
      }
    }

    let selectorClicksHandler = (box, actionType) => {
      if (!isEvent(findDOMNode(this), box)) {
        const { startDate, endDate } = selectionState(box)
        this._selectSlot({
          startDate,
          endDate,
          action: actionType,
          box,
        })
      }
      this.setState({ selecting: false })
    }

    selector.on('selecting', maybeSelect)
    selector.on('selectStart', maybeSelect)

    selector.on('beforeSelect', box => {
      if (this.props.selectable !== 'ignoreEvents') return

      return !isEvent(findDOMNode(this), box)
    })

    selector.on('click', box => selectorClicksHandler(box, 'click'))

    selector.on('doubleClick', box => selectorClicksHandler(box, 'doubleClick'))

    selector.on('select', bounds => {
      if (this.state.selecting) {
        this._selectSlot({ ...this.state, action: 'select', bounds })
        this.setState({ selecting: false })
      }
    })
  }

  _teardownSelectable = () => {
    if (!this._selector) return
    this._selector.teardown()
    this._selector = null
  }

  _selectSlot = ({ startDate, endDate, action, bounds, box }) => {
    let current = startDate,
      slots = []

    while (dates.lte(current, endDate)) {
      slots.push(current)
      current = dates.add(current, this.props.step, 'minutes')
    }

    notify(this.props.onSelectSlot, {
      slots,
      start: startDate,
      end: endDate,
      resourceId: this.props.resource,
      action,
      bounds,
      box,
    })
  }

  _select = (...args) => {
    notify(this.props.onSelectEvent, args)
  }

  _doubleClick = (...args) => {
    notify(this.props.onDoubleClickEvent, args)
  }
}

export default DayColumn
