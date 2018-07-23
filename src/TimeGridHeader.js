import PropTypes from 'prop-types'
import cn from 'classnames'
import scrollbarSize from 'dom-helpers/util/scrollbarSize'
import React from 'react'

import dates from './utils/dates'
import { elementType, accessor, dateFormat } from './utils/propTypes'
import localizer from './localizer'
import DateContentRow from './DateContentRow'
import Header from './Header'
import { notify } from './utils/helpers'
import { accessor as get } from './utils/accessors'

class TimeGridHeader extends React.Component {
  static propTypes = {
    range: PropTypes.array.isRequired,
    events: PropTypes.array.isRequired,
    resources: PropTypes.array,
    getNow: PropTypes.func.isRequired,
    isOverflowing: PropTypes.bool,

    dayFormat: dateFormat,
    eventPropGetter: PropTypes.func,
    dayPropGetter: PropTypes.func,
    culture: PropTypes.string,

    rtl: PropTypes.bool,
    width: PropTypes.number,

    accessors: PropTypes.object.isRequired,
    components: PropTypes.object.isRequired,
    getters: PropTypes.object.isRequired,

    selected: PropTypes.object,
    selectable: PropTypes.oneOf([true, false, 'ignoreEvents']),
    longPressThreshold: PropTypes.number,

    onSelectSlot: PropTypes.func,
    onSelectEvent: PropTypes.func,
    onDoubleClickEvent: PropTypes.func,
    onDrillDown: PropTypes.func,
    getDrilldownView: PropTypes.func.isRequired,
  }

  handleHeaderClick = (date, view, e) => {
    e.preventDefault()
    notify(this.props.onDrillDown, [date, view])
  }

  renderHeaderResources(range, resources) {
    const { accessors, getNow } = this.props
    const today = getNow()

    return range.map((date, i) => {
      return resources.map((resource, j) => {
        return (
          <div
            key={`${i}-${j}`}
            className={cn(
              'rbc-header',
              dates.eq(date, today, 'day') && 'rbc-today'
            )}
          >
            {accessors.resourceTitle(resource)}
          </div>
        )
      })
    })
  }

  renderHeaderCells(range) {
    let {
      dayFormat,
      culture,
      dayPropGetter,
      getDrilldownView,
      getNow,
      components: { header: HeaderComponent = Header },
    } = this.props

    const today = getNow()

    return range.map((date, i) => {
      let drilldownView = getDrilldownView(date)
      let label = localizer.format(date, dayFormat, culture)

      const { className, style } = (dayPropGetter && dayPropGetter(date)) || {}

      let header = (
        <HeaderComponent
          date={date}
          label={label}
          localizer={localizer}
          format={dayFormat}
          culture={culture}
        />
      )

      return (
        <div
          key={i}
          style={style}
          className={cn(
            'rbc-header',
            className,
            dates.eq(date, today, 'day') && 'rbc-today'
          )}
        >
          {drilldownView ? (
            <a
              href="#"
              onClick={e => this.handleHeaderClick(date, drilldownView, e)}
            >
              {header}
            </a>
          ) : (
            <span>{header}</span>
          )}
        </div>
      )
    })
  }
  renderRow = resource => {
    let {
      events,
      rtl,
      selectable,
      getNow,
      range,
      getters,
      accessors,
      components,
    } = this.props

    const resourceId = accessors.resourceId(resource)
    let eventsToDisplay = resource
      ? events.filter(event => accessors.resource(event) === resourceId)
      : events

    return (
      <DateContentRow
        isAllDay
        rtl={rtl}
        getNow={getNow}
        minRows={2}
        range={range}
        events={eventsToDisplay}
        resourceId={resourceId}
        className="rbc-allday-cell"
        selectable={selectable}
        selected={this.props.selected}
        components={components}
        accessors={accessors}
        getters={getters}
        onSelect={this.props.onSelectEvent}
        onDoubleClick={this.props.onDoubleClickEvent}
        onSelectSlot={this.props.onSelectSlot}
        longPressThreshold={this.props.longPressThreshold}
      />
    )
  }

  render() {
    let {
      width,
      rtl,
      resources,
      range,
      isOverflowing,
      components: { timeGutterHeader: TimeGutterHeader },
    } = this.props

    let style = {}
    if (isOverflowing) {
      style[rtl ? 'marginLeft' : 'marginRight'] = `${scrollbarSize()}px`
    }

    return (
      <div
        ref="headerCell"
        style={style}
        className={cn('rbc-time-header', isOverflowing && 'rbc-overflowing')}
      >
        <div className="rbc-label rbc-time-header-gutter" style={{ width }}>
          {TimeGutterHeader && <TimeGutterHeader />}
        </div>

        <div className="rbc-time-header-content">
          <div className="rbc-row rbc-time-header-cell">
            {this.renderHeaderCells(range)}
          </div>
          {resources && (
            <div className="rbc-row rbc-row-resource">
              {this.renderHeaderResources(range, resources)}
            </div>
          )}

          {resources ? (
            <div className="rbc-row rbc-row-resource">
              {resources.map(resource => this.renderRow(resource))}
            </div>
          ) : (
            this.renderRow()
          )}
        </div>
      </div>
    )
  }
}

export default TimeGridHeader
