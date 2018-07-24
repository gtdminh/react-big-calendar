import PropTypes from 'prop-types'
import React from 'react'
import dates from '../../utils/dates'
import { getSlotAtX, pointInBox } from '../../utils/selection'
import { findDOMNode } from 'react-dom'

import { eventSegments } from '../../utils/eventLevels'
import Selection, { getBoundsForNode } from '../../Selection'
import EventRow from '../../EventRow'
import { dragAccessors } from './common'

const propTypes = {}

class WeekWrapper extends React.Component {
  static propTypes = {
    slotMetrics: PropTypes.object.isRequired,
    accessors: PropTypes.object.isRequired,
    getters: PropTypes.object.isRequired,
    components: PropTypes.object.isRequired,
    resourceId: PropTypes.any,
  }

  static contextTypes = {
    onEventDrop: PropTypes.func,
    onEventResize: PropTypes.func,

    onMove: PropTypes.func,
    onResize: PropTypes.func,
    dragAndDropAction: PropTypes.object,
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

  reset() {
    if (this.state.segment) this.setState({ segment: null })
  }

  handleMove = ({ event }, { x, y }, node) => {
    const metrics = this.props.slotMetrics
    const { accessors } = this.props

    if (!event) return

    let rowBox = getBoundsForNode(node)

    if (!pointInBox(rowBox, { x, y })) {
      this.reset()
      return
    }

    // Make sure to maintain the time of the start date while moving it to the new slot
    let start = dates.merge(
      metrics.getDateForSlot(getSlotAtX(rowBox, x, false, metrics.slots)),
      accessors.start(event)
    )

    let end = dates.add(
      start,
      dates.diff(accessors.start(event), accessors.end(event), 'minutes'),
      'minutes'
    )

    const segment = eventSegments(
      {
        ...event,
        end,
        start,
        __isPreview: true,
      },
      metrics.range,
      dragAccessors
    )

    this.setState({ segment })
  }

  handleResize({ event, direction }, point, node) {
    let segment = null
    let start, end
    const { accessors, slotMetrics: metrics, isAllDay } = this.props

    let rowBox = getBoundsForNode(node)
    let cursorInRow = pointInBox(rowBox, point)

    if (direction === 'RIGHT') {
      start = accessors.start(event)

      if (cursorInRow) {
        if (metrics.last < start) return this.reset()
        // add min
        end = metrics.getDateForSlot(
          getSlotAtX(rowBox, point.x, false, metrics.slots)
        )
      } else if (
        dates.inRange(start, metrics.first, metrics.last) ||
        (rowBox.bottom < point.y && +metrics.first > +start)
      ) {
        end = dates.add(metrics.last, 1, 'milliseconds')
      } else {
        this.setState({ segment: null })
        return
      }

      end = dates.max(end, start)
    } else if (direction === 'LEFT') {
      end = accessors.end(event)

      // inbetween Row
      if (cursorInRow) {
        if (metrics.first > end) return this.reset()

        start = metrics.getDateForSlot(
          getSlotAtX(rowBox, point.x, false, metrics.slots)
        )
      } else if (
        dates.inRange(end, metrics.first, metrics.last) ||
        (rowBox.top > point.y && +metrics.last < +end)
      ) {
        start = dates.add(metrics.first, -1, 'milliseconds')
      } else {
        this.reset()
        return
      }

      start = dates.min(end, start)
    }

    segment = eventSegments(
      {
        ...event,
        end,
        start,
        __isPreview: true,
      },
      metrics.range,
      dragAccessors
    )

    this.setState({ segment })
  }

  _selectable = () => {
    let node = findDOMNode(this).closest('.rbc-month-row, .rbc-allday-cell')
    let container = node.closest('.rbc-month-view, .rbc-time-view')

    let selector = (this._selector = new Selection(() => container))

    selector.on('beforeSelect', point => {
      const { isAllDay } = this.props
      const { action } = this.context.dragAndDropAction

      return (
        action === 'move' ||
        (action === 'resize' &&
          (!isAllDay || pointInBox(getBoundsForNode(node), point)))
      )
    })

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
    selector.on('selectStart', handler)

    selector.on('select', box => {
      const { dragAndDropAction } = this.context

      switch (dragAndDropAction.action) {
        case 'move':
          this.handleEventDrop()
          break
        case 'resize':
          this.handleEventResize(box, node)
          break
      }
    })

    selector.on('click', () => {
      this.context.onMove(null)
    })
  }

  handleEventResize = (box, node) => {
    const { segment } = this.state

    if (!segment || !pointInBox(getBoundsForNode(node), box)) return
    const { dragAndDropAction, onResize, onEventResize } = this.context

    this.reset()

    onResize(null)

    onEventResize({
      event: dragAndDropAction.event,
      start: segment.event.start,
      end: segment.event.end,
    })
  }

  handleEventDrop = () => {
    const { resourceId } = this.props
    const { segment } = this.state

    if (!segment) return
    const { dragAndDropAction, onMove, onEventDrop } = this.context

    this.reset()

    onMove(null)

    onEventDrop({
      resourceId,
      event: dragAndDropAction.event,
      start: segment.event.start,
      end: segment.event.end,
      isAllDay: true,
    })
  }

  _teardownSelectable = () => {
    if (!this._selector) return
    this._selector.teardown()
    this._selector = null
  }

  render() {
    const { children, accessors } = this.props

    let { segment } = this.state

    return (
      <div className="rbc-addons-dnd-row-body">
        {children}

        {segment && (
          <EventRow
            {...this.props}
            selected={null}
            className="rbc-addons-dnd-drag-row"
            segments={[segment]}
            accessors={{
              ...accessors,
              ...dragAccessors,
            }}
          />
        )}
      </div>
    )
  }
}

WeekWrapper.propTypes = propTypes

export default WeekWrapper
