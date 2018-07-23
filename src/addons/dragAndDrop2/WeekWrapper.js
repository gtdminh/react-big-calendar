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
    resource: PropTypes.any,
  }

  static contextTypes = {
    onEventDrop: PropTypes.func,
    movingEvent: PropTypes.object,
    startAccessor: PropTypes.any.isRequired,
    endAccessor: PropTypes.any.isRequired,
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
    let node = findDOMNode(this).closest(
      '.rbc-month-row, .rbc-time-header-content'
    )
    let container = node.closest('.rbc-month-view, .rbc-time-view')

    let selector = (this._selector = new Selection(() => container))

    let selectionState = ({ y, x }) => {
      const metrics = this.props.slotMetrics
      const { accessors } = this.props

      const { movingEvent: event } = this.context
      if (!event) return

      let rowBox = getBoundsForNode(node)

      if (!pointInBox(rowBox, { x, y })) {
        if (this.state.selecting) this.setState({ selecting: false })
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

      return {
        segment,
        selecting: true,
      }
    }

    selector.on('selecting', box => {
      this.setState(selectionState(box))
    })

    selector.on('selectStart', box => {
      this.setState(selectionState(box))
    })

    selector.on('select', () => {
      if (this.state.selecting) {
        this.handleEventDrop(this.state)
      }
    })
    selector.on('click', () => {
      this.context.onMove(null)
    })
  }

  handleEventDrop = ({ segment: { event } }) => {
    const { resource } = this.props
    const { movingEvent, onMove, onEventDrop } = this.context

    this.setState({ selecting: false })

    onMove(null)

    onEventDrop({
      event: movingEvent,
      start: event.start,
      end: event.end,
      resourceId: resource,
      isAllDay: true,
    })
  }

  _teardownSelectable = () => {
    if (!this._selector) return
    this._selector.teardown()
    this._selector = null
  }

  render() {
    const { children, slotMetrics, getters, components, accessors } = this.props

    let { selecting, segment } = this.state
    const { movingEvent } = this.context

    return (
      <div className="rbc-addons-dnd-row-body">
        {children}

        {selecting &&
          movingEvent && (
            <EventRow
              selected={null}
              className="rbc-addons-dnd-drag-row"
              segments={[segment]}
              slotMetrics={slotMetrics}
              getters={getters}
              components={components}
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
