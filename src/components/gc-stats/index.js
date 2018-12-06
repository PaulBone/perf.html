/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import explicitConnect from '../../utils/connect';
import type {
  ExplicitConnectOptions,
  ConnectedProps,
} from '../../utils/connect';
import type {
  PauseInfo,
  GCStats,
  GCMinorMarker,
} from '../../types/profile-derived';

import type { PreviewSelection } from '../../types/actions';
import { selectedThreadSelectors } from '../../selectors/per-thread';
import {
  getPreviewSelection,
  getProfileInterval,
  getZeroAt,
} from '../../selectors/profile';
import {
  formatMilliseconds,
  formatSeconds,
  formatNumber,
  formatBytes,
  formatValueTotal,
} from '../../utils/format-numbers';
import type { Milliseconds, StartEndRange } from '../../types/units';
import * as ProfileData from '../../profile-logic/profile-data';

require('./index.css');

type DispatchProps = {||};

type StateProps = {|
  +gcStats: GCStats,
  +previewSelection: PreviewSelection,
  +timeRange: StartEndRange,
  +zeroAt: Milliseconds,
|};

type Props = ConnectedProps<{||}, StateProps, DispatchProps>;

function _nurseryMemory(markers: GCMinorMarker[], zeroAt: number): React.Node {
  if (!markers.some(m => m.data.nursery)) {
    return null;
  }

  return (
    <div>
      <p>Nursery memory information:</p>
      <table>
        <tr>
          <th>Time</th>
          <th>Tenured</th>
          <th>Used</th>
          <th>Lazy</th>
          <th>Capacity</th>
        </tr>
        {markers.map(m => {
          const time = <td>{formatSeconds(m.start - zeroAt)}</td>;

          if (m.data.nursery && m.data.nursery.status === 'complete') {
            const nursery = m.data.nursery;
            return (
              <tr key={m.start}>
                {time}
                <td>{formatBytes(nursery.bytes_tenured)}</td>
                <td>{formatBytes(nursery.bytes_used)}</td>
                <td>
                  {nursery.lazy_capacity
                    ? formatBytes(nursery.lazy_capacity)
                    : null}
                </td>
                <td>
                  {nursery.cur_capacity
                    ? formatBytes(nursery.cur_capacity)
                    : null}
                </td>
              </tr>
            );
          }
          return <tr key={m.start}>{time}</tr>;
        })}
      </table>
    </div>
  );
}

function _pauseInfoView(
  name: string,
  info: PauseInfo | null,
  totalTime: Milliseconds
): React.Node {
  if (!info) {
    return <div>No pauses for {name}.</div>;
  }

  return (
    <div>
      {info.numberOfPauses} pauses for {name}:<br />
      <table>
        <tr>
          <th className="tooltipLabel">Mean:</th>
          <td>
            {formatMilliseconds(info.meanPause, 3, 2)} &plusmn;{formatNumber(
              info.stdDev,
              3,
              2
            )}
          </td>
        </tr>
        <tr>
          <th className="tooltipLabel">Median:</th>
          <td>{formatMilliseconds(info.medianPause, 3, 2)}</td>
        </tr>
        <tr>
          <th className="tooltipLabel">90th percentile:</th>
          <td>{formatMilliseconds(info.p90Pause, 3, 2)}</td>
        </tr>
        <tr>
          <th className="tooltipLabel">Max:</th>
          <td>{formatMilliseconds(info.maxPause, 3, 2)}</td>
        </tr>
        <tr>
          <th className="tooltipLabel">Total:</th>
          <td>
            {formatValueTotal(info.totalPaused, totalTime, formatMilliseconds)}
          </td>
        </tr>
      </table>
    </div>
  );
}

class GCStatsView extends React.PureComponent<Props> {
  render() {
    const { gcStats, timeRange, zeroAt } = this.props;

    const totalTime = timeRange.end - timeRange.start;

    return (
      <div className="gcStats">
        <div>
          {_pauseInfoView(
            'Nursery collections',
            gcStats.minorPauses,
            totalTime
          )}
          {_pauseInfoView('Major slices', gcStats.slicePauses, totalTime)}
          {_pauseInfoView('All pauses', gcStats.allPauses, totalTime)}
          Number of majors: {gcStats.numMajor}
        </div>
        {_nurseryMemory(gcStats.minorMarkers, zeroAt)}
      </div>
    );
  }
}

const options: ExplicitConnectOptions<{||}, StateProps, DispatchProps> = {
  mapStateToProps: state => {
    return {
      gcStats: selectedThreadSelectors.getPreviewFilteredGCStats(state),
      previewSelection: getPreviewSelection(state),
      timeRange: ProfileData.getTimeRangeForThread(
        selectedThreadSelectors.getPreviewFilteredThread(state),
        getProfileInterval(state)
      ),
      zeroAt: getZeroAt(state),
    };
  },
  component: GCStatsView,
};

export default explicitConnect(options);
