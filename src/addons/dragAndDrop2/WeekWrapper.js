import PropTypes from 'prop-types'
import React from 'react'
import dates from '../../utils/dates'
import { getSlotAtX, pointInBox } from '../../utils/selection'
import { findDOMNode } from 'react-dom'

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

  handleMove = ({ event }, { x, y }, node) => {
    const metrics = this.props.slotMetrics
    const { accessors } = this.props

    if (!event) return

    let rowBox = getBoundsForNode(node)

    if (!pointInBox(rowBox, { x, y })) {
      if (this.state.segment) this.setState({ segment: false })
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

    const segment = metrics.getEventSegment(
      { ...event, start, end, __isPreview: true },
      dragAccessors
    )

    this.setState({ segment })
  }
  handleResize({ event, direction }, box, node) {}
  _selectable = () => {
    let node = findDOMNode(this).closest('.rbc-month-row, .rbc-allday-cell')
    let container = node.closest('.rbc-month-view, .rbc-time-view')

    let selector = (this._selector = new Selection(() => container))

    let handler = box => {
      const { dragAndDropAction } = this.context
      if (!dragAndDropAction) return

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

    selector.on('select', () => {
      if (this.state.segment) {
        this.handleEventDrop(this.state)
      }
    })

    selector.on('click', () => {
      this.context.onMove(null)
    })
  }

  handleEventDrop = ({ segment: { event } }) => {
    const { resourceId } = this.props
    const { dragAndDropAction, onMove, onEventDrop } = this.context

    this.setState({ segment: null })

    onMove(null)

    onEventDrop({
      resourceId,
      event: dragAndDropAction.event,
      start: event.start,
      end: event.end,
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
