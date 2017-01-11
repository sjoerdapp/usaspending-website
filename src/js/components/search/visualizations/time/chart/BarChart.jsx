/**
 * BarChart.jsx
 * Created by Kevin Li 12/16/16
 */

import React from 'react';
import { scaleBand, scaleLinear } from 'd3-scale';
import _ from 'lodash';

import BarItem from './BarItem';
import BarXAxis from './BarXAxis';
import BarYAxis from './BarYAxis';

/* eslint-disable react/no-unused-prop-types */
// we're catching the props before they're fully set, so eslint thinks these props are unused
const propTypes = {
    groups: React.PropTypes.array,
    width: React.PropTypes.number,
    height: React.PropTypes.number,
    xSeries: React.PropTypes.array,
    ySeries: React.PropTypes.array,
    showTooltip: React.PropTypes.func,
    padding: React.PropTypes.object
};
/* eslint-enable react/no-unused-prop-types */

const defaultProps = {
    padding: {
        left: 70,
        bottom: 20
    }
};

export default class BarChart extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            xScale: null,
            yScale: null,
            yTicks: null,
            items: [],
            xValues: [],
            yValues: [],
            yAverage: 0,
            xAxisPos: 0,
            graphHeight: 0,
            activeBar: null,
            padding: {
                left: 0,
                bottom: 20
            }
        };

        this.dataPoints = {};

        this.selectBar = this.selectBar.bind(this);
        this.deselectBar = this.deselectBar.bind(this);
        this.deregisterBar = this.deregisterBar.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        if (!_.isEqual(nextProps, this.props)) {
            this.generateChart(nextProps);
        }
    }


    shouldComponentUpdate(nextProps, nextState) {
        if (!_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state)) {
            return true;
        }
        return false;
    }

    generateChart(props) {
        // flatten the Y values into a single array
        const allY = _.flatten(props.ySeries);

        // calculate the axes and ranges
        const yRange = [];

        // determine the Y axis minimum
        let yMin = _.min(allY);
        if (yMin > 0) {
            // set the minimum to zero if there are no negative values
            yMin = 0;
        }
        yRange.push(yMin);
        yRange.push(_.max(allY));

        // calculate what the visible area of the chart itself will be (excluding the axes and their
        // labels)
        const graphWidth = props.width - props.padding.bottom;
        const graphHeight = props.height - props.padding.bottom;

        // use D3 to calculate the X and Y axes
        // remember, in D3 scales, domain is the data range (or data set for non-continuous data)
        // and range is the range of possible pixel positions along the axis
        const xScale = scaleBand()
                    .domain(props.groups)
                    .range([0, graphWidth])
                    .round(true);

        const yScale = scaleLinear()
            .domain(yRange)
            .range([0, graphHeight])
            .clamp(true);

        // calculate the X axis Y position
        let xAxisPos = 0;
        if (yMin !== 0) {
            xAxisPos = yScale(0);
        }

        // generate the data points on the chart
        const items = [];
        // iterate through each of the groups
        props.groups.forEach((group, groupIndex) => {
            const yData = props.ySeries[groupIndex];
            const xData = props.xSeries[groupIndex];

            // put 20px padding on each side of the group
            const groupWidth = xScale.bandwidth() - 40;
            // subdivide the group width based on the number of group items to determine the width
            // of each data point
            const itemWidth = groupWidth / yData.length;
            // calculate where on the X axis the group should start (offset this by 20px to account
            // for the padding between groups)
            const startingXPos = xScale(group) + 20;

            // iterate through the group data points and insert them into the chart
            yData.forEach((item, i) => {
                // the X position is the group's starting X positioning plus the previous group
                // bar widths
                const xPos = startingXPos + (i * itemWidth);
                // SVG starts drawing at the top and goes down the specified height, so for positive
                // bars, the yPos should be the top of the bar (for positive values).
                // The yScale() function returns the number of px the input value is from the
                // bottom of the Y axis. So for positive values, we can calculate the bar height by
                // substracting the distance 0 is from the bottom of the chart (yScale(0)) from
                // the yScale(item) value, (which represents the total height from the bottom of the
                // Y-axis to the data point). This gives us the height from the X-axis to the
                // positive data point.
                let barHeight = yScale(item) - yScale(0);
                // The top of the chart in SVG coordinates is (0,0), the bottom is (0,chart height).
                // Start at the bottom of the chart, go up to the X axis, and then keep going up
                // the expected bar height. This way, the bottom of the rect will always be the
                // X-axis.
                let yPos = graphHeight - yScale(0) - barHeight;

                if (item < 0) {
                    // slightly different calculation for negative values
                    // the top of the bar is always the X-axis
                    yPos = graphHeight - yScale(0);
                    // the bar height is the remaining distance to the yScale() position
                    barHeight = yScale(0) - yScale(item);
                }

                const barIdentifier = `${groupIndex}-${i}`;

                const bar = (<BarItem
                    key={`data-${barIdentifier}`}
                    identifier={barIdentifier}
                    dataY={item}
                    dataX={xData[i]}
                    graphHeight={graphHeight}
                    height={barHeight}
                    width={itemWidth}
                    x={xPos}
                    y={yPos}
                    selectBar={this.selectBar}
                    deselectBar={this.deselectBar}
                    deregisterBar={this.deregisterBar}
                    ref={(component) => {
                        this.dataPoints[barIdentifier] = component;
                    }} />);
                items.push(bar);
            });
        });

        // save it all to state
        this.setState({
            xScale,
            yScale,
            items,
            xAxisPos,
            graphHeight,
            yValues: allY,
            xValues: props.groups,
            yAverage: _.mean(allY),
            yTicks: yScale.ticks(7)
        });
    }

    selectBar(barIdentifier, isTouch = false) {
        if (isTouch && this.state.activeBar === barIdentifier) {
            // a touch event occurred on an already active bar, this indicates a deselection
            this.deselectBar();
            return;
        }

        this.setState({
            activeBar: barIdentifier
        }, () => {
            // notify all the child items of the change
            _.forEach(this.dataPoints, (value) => {
                value.updateActive(this.state.activeBar);
            });

            this.prepareTooltip(barIdentifier);
        });
    }

    deselectBar() {
        this.setState({
            activeBar: null
        }, () => {
            // notify all the child items of the change
            _.forEach(this.dataPoints, (value) => {
                value.updateActive(this.state.activeBar);
            });

            // hide the tooltip
            this.props.showTooltip(null, 0, 0);
        });
    }

    deregisterBar(barIdentifier) {
        // the data point is about to be unmounted, remove it from the data point object
        delete this.dataPoints[barIdentifier];
    }

    prepareTooltip(barIdentifier) {
        // fetch the original data
        const groupIndex = barIdentifier.split('-')[0];
        const subIndex = barIdentifier.split('-')[1];
        const groupLabel = this.props.groups[groupIndex];
        const xValue = this.props.xSeries[groupIndex][subIndex];
        const yValue = this.props.ySeries[groupIndex][subIndex];

        // calculate the tooltip position
        // get the top of the chart on the HTML page
        const chartTop = this.divRef.offsetTop;
        const chartLeft = this.divRef.offsetLeft;
        const xAxisHeight = this.state.graphHeight - this.state.yScale(0);

        // calculate where the halfway to the top of the bar is for positive values
        let yPos = chartTop + xAxisHeight;
        if (yValue >= 0) {
            // for positive values, the bar height is the distance from the Y scale position of
            // the data point (the top of the bar) to the X axis position
            const barHeight = this.state.yScale(yValue) - this.state.yScale(0);

            // since the tooltip exists in the HTML DOM instead of the SVG, offset its Y position
            // by adding the SVG's DOM Y position to it
            yPos -= (barHeight / 2);
        }
        else {
            // for negative values, bar height is calculated as the distance from the X axis to
            // the Y scale position for the data point (the bottom of the bar)
            const barHeight = this.state.yScale(0) - this.state.yScale(yValue);
            // since we are starting at the X axis height, we need to keep going (adding Y position)
            // to the halfway point of the bar
            yPos += (barHeight / 2);
        }

        // determine where the bar starting position is
        // this is the group's starting X position plus 20px padding between groups
        // plus the number of previous group members times the width of each group member
        const groupWidth = this.state.xScale.bandwidth() - 40;
        const itemWidth = groupWidth / this.props.xSeries[groupIndex].length;
        let barXAnchor = this.state.xScale(groupLabel) + 20 + (subIndex * itemWidth);
        // now adjust the anchor so it is halfway through the bar
        barXAnchor += (itemWidth / 2);
        // now place the tooltip halfway in the bar's width
        const xPos = chartLeft + barXAnchor + this.props.padding.left;

        // show the tooltip
        this.props.showTooltip({
            xValue,
            yValue,
            group: groupLabel,
            percentage: (yValue / _.sum(this.state.yValues))
        }, xPos, yPos);
    }

    render() {
        // add 20px to the top of the chart to avoid cutting off label text
        // wrap the chart contents in a group and transform it down 20px to avoid impacting
        // positioning calculations
        return (
            <div
                ref={(div) => {
                    this.divRef = div;
                }}>
                <svg
                    className="bar-graph"
                    width={this.props.width}
                    height={this.props.height + 20}
                    ref={(svg) => {
                        this.svgRef = svg;
                    }}>
                    <g className="bar-graph-body" transform="translate(0,20)">
                        <BarYAxis
                            height={this.props.height - this.props.padding.bottom}
                            width={this.props.width - this.props.padding.left}
                            padding={this.props.padding}
                            data={this.state.yValues}
                            scale={this.state.yScale}
                            ticks={this.state.yTicks}
                            average={this.state.yAverage}
                            generatedYAxis={this.generatedYAxis} />

                        <BarXAxis
                            top={this.props.height - this.props.padding.bottom}
                            width={this.props.width - this.props.padding.left}
                            padding={this.props.padding}
                            data={this.state.xValues}
                            scale={this.state.xScale}
                            axisPos={this.state.xAxisPos} />

                        <g
                            className="bar-data"
                            transform={`translate(${this.props.padding.left},0)`}>
                            {this.state.items}
                        </g>
                    </g>
                </svg>
            </div>
        );
    }
}

BarChart.propTypes = propTypes;
BarChart.defaultProps = defaultProps;
