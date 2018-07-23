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
    movingEvent: PropTypes.object,
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

  _selectable = () => {
    let node = findDOMNode(this)
    const { slotMetrics } = this.props

    let selector = (this._selector = new Selection(() =>
      node.closest('.rbc-time-view')
    ))

    let selectionState = ({ y, x }) => {
      const { movingEvent } = this.context
      if (!movingEvent) return

      if (!pointerInColumn(node, x, y)) {
        if (this.state.selecting) this.setState({ selecting: false })
        return
      }

      let { top, bottom } = getBoundsForNode(node)

      let range = Math.abs(top - bottom)

      let currentSlot = slotMetrics.closestSlotToPosition(
        (y - top - this.eventOffsetTop) / range
      )

      let end = dates.add(
        currentSlot,
        dates.diff(movingEvent.start, movingEvent.end, 'minutes'),
        'minutes'
      )

      const { startDate, endDate, ...state } = slotMetrics.getRange(
        currentSlot,
        end
      )

      return {
        event: {
          ...movingEvent,
          start: startDate,
          end: endDate,
        },
        ...state,
        selecting: true,
      }
    }

    selector.on('selecting', box => {
      this.setState(selectionState(box))
    })

    selector.on('selectStart', box => {
      const eventNode = getEventNodeFromPoint(node, box)

      if (!eventNode) return
      this.eventOffsetTop = box.y - getBoundsForNode(eventNode).top

      this.setState(selectionState(box))
    })

    selector.on('select', () => {
      if (this.state.selecting) {
        this.handleEventDrop(this.state.event)
      }
    })
    selector.on('click', () => {
      this.context.onMove(null)
    })
  }

  handleEventDrop = ({ start, end }) => {
    const { resource } = this.props
    const { movingEvent, onMove, onEventDrop } = this.context

    this.setState({ selecting: false })

    onMove(null)

    onEventDrop({
      end,
      start,
      event: movingEvent,
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

    let { selecting, top, event, height } = this.state
    const moving = this.context.movingEvent

    if (!moving || !selecting) return children

    const events = children.props.children

    const { start, end } = event
    let format = 'eventTimeRangeFormat'

    let label
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

          {selecting &&
            moving && (
              <TimeGridEvent
                event={event}
                label={label}
                className="rbc-addons-dnd-drag-preview"
                style={{ top, height, width: 100 }}
                eventComponent={components.event}
                eventPropGetter={getters.eventProp}
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
