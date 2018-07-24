import PropTypes from 'prop-types'
import React from 'react'
import dates from '../../utils/dates'
import { findDOMNode } from 'react-dom'

import Selection, {
  getBoundsForNode,
  getEventNodeFromPoint,
} from '../../Selection'
import TimeGridEvent from '../../TimeGridEvent'
import { dragAccessors } from './common'
import NoopWrapper from '../../NoopWrapper'

const pointerInColumn = (node, x, y) => {
  const { left, right, top } = getBoundsForNode(node)
  return x < right + 10 && x > left && y > top
}
const propTypes = {}

class EventContainerWrapper extends React.Component {
  static propTypes = {
    accessors: PropTypes.object.isRequired,
    components: PropTypes.object.isRequired,
    getters: PropTypes.object.isRequired,
    localizer: PropTypes.object.isRequired,
    slotMetrics: PropTypes.object.isRequired,
    resource: PropTypes.any,
  }

  static contextTypes = {
    onEventDrop: PropTypes.func,
    dragAndDropAction: PropTypes.object,
    onMove: PropTypes.func,
  }

  constructor(...args) {
    super(...args)
    this.state = {}
  }

  componentDidMount() {
    this._selectable()
  }

  componentWillUnmount() {
    this._teardownSelectable()
  }

  maybeReset(node, point) {
    if (!pointerInColumn(node, point.x, point.y)) {
      if (this.state.event) this.setState({ event: null })
      return true
    }
  }

  handleMove = ({ event }, point, node) => {
    const { slotMetrics } = this.props

    if (this.maybeReset(node, point)) return

    let currentSlot = slotMetrics.closestSlotFromPoint(
      point,
      getBoundsForNode(node)
    )

    let end = dates.add(
      currentSlot,
      dates.diff(event.start, event.end, 'minutes'),
      'minutes'
    )

    const { startDate, endDate, ...state } = slotMetrics.getRange(
      currentSlot,
      end
    )

    this.setState({
      event: {
        ...event,
        start: startDate,
        end: endDate,
      },
      ...state,
    })
  }

  handleResize({ event, direction }, point, node) {
    let start, end
    const { accessors, slotMetrics } = this.props

    if (this.maybeReset(node, point)) return

    let currentSlot = slotMetrics.closestSlotFromPoint(
      point,
      getBoundsForNode(node)
    )
    if (direction === 'UP') {
      end = accessors.end(event)
      start = dates.min(currentSlot, slotMetrics.closestSlotFromDate(end, -1))
    } else if (direction === 'DOWN') {
      start = accessors.start(event)
      end = dates.max(currentSlot, slotMetrics.closestSlotFromDate(start))
    }

    const { startDate, endDate, ...state } = slotMetrics.getRange(start, end)

    this.setState({
      event: {
        ...event,
        start: startDate,
        end: endDate,
      },
      ...state,
    })
  }

  _selectable = () => {
    let node = findDOMNode(this)
    let selector = (this._selector = new Selection(() =>
      node.closest('.rbc-time-view')
    ))

    let handler = box => {
      const { dragAndDropAction } = this.context

      switch (dragAndDropAction.action) {
        case 'move':
          this.handleMove(dragAndDropAction, box, node)
          break
        case 'resize':
          this.handleResize(dragAndDropAction, box, node)
          break
      }
    }

    selector.on('selecting', handler)

    selector.on('selectStart', box => {
      const eventNode = getEventNodeFromPoint(node, box)

      if (!eventNode) return
      this.eventOffsetTop = box.y - getBoundsForNode(eventNode).top
      this.eventOffsetBottom = box.y - getBoundsForNode(eventNode).bottom

      handler(box)
    })

    selector.on('select', () => {
      if (this.state.event) {
        this.handleEventDrop(this.state.event)
      }
    })
    selector.on('click', () => {
      this.context.onMove(null)
    })
  }

  handleEventDrop = ({ start, end }) => {
    const { resource } = this.props
    const { dragAndDropAction, onMove, onEventDrop } = this.context

    this.setState({ event: null })

    onMove(null)

    onEventDrop({
      end,
      start,
      event: dragAndDropAction.event,
      resourceId: resource,
    })
  }

  _teardownSelectable = () => {
    if (!this._selector) return
    this._selector.teardown()
    this._selector = null
  }

  render() {
    const {
      children,
      accessors,
      components,
      getters,
      slotMetrics,
      localizer,
    } = this.props

    let { event, top, height } = this.state

    if (!event) return children

    const events = children.props.children
    const { start, end } = event

    let label
    let format = 'eventTimeRangeFormat'

    const startsBeforeDay = slotMetrics.startsBeforeDay(start)
    const startsAfterDay = slotMetrics.startsAfterDay(end)

    if (startsBeforeDay) format = 'eventTimeRangeEndFormat'
    else if (startsAfterDay) format = 'eventTimeRangeStartFormat'

    if (startsBeforeDay && startsAfterDay) label = localizer.messages.allDay
    else label = localizer.format({ start, end }, format)

    return React.cloneElement(children, {
      children: (
        <React.Fragment>
          {events}

          {event && (
            <TimeGridEvent
              event={event}
              label={label}
              className="rbc-addons-dnd-drag-preview"
              style={{ top, height, width: 100 }}
              getters={getters}
              components={{ ...components, eventWrapper: NoopWrapper }}
              accessors={{ ...accessors, ...dragAccessors }}
              continuesEarlier={startsBeforeDay}
              continuesLater={startsAfterDay}
            />
          )}
        </React.Fragment>
      ),
    })
  }
}

EventContainerWrapper.propTypes = propTypes

export default EventContainerWrapper
