/**
 * CorePeriodOfPerformance.js
 * Created by David Trinh 10/5/18
 */

import moment from 'moment';

export const parseDate = (string) => moment(string, 'YYYY-MM-DD');
export const formatDate = (date) => date.format('MMM. DD, YYYY');

const CorePeriodOfPerformance = {
    populateCore(data) {
        this._startDate = (data.startDate && parseDate(data.startDate)) || '';
        this._endDate = (data.endDate && parseDate(data.endDate)) || '';
        this._awardDate = (data.awardDate && parseDate(data.awardDate)) || '';
        this._lastModifiedDate = (data.lastModifiedDate && parseDate(data.lastModifiedDate)) || '';
        this._potentialEndDate = (data.potentialEndDate && parseDate(data.potentialEndDate)) || '';
    },
    get startDate() {
        if (this._startDate) {
            return formatDate(this._startDate);
        }
        return '';
    },
    get endDate() {
        if (this._endDate) {
            return formatDate(this._endDate);
        }
        return '';
    },
    get awardDate() {
        if (this._awardDate) {
            return formatDate(this._awardDate);
        }
        return '';
    },
    get lastModifiedDate() {
        if (this._lastModifiedDate) {
            return formatDate(this._lastModifiedDate);
        }
        return '';
    },
    get potentialEndDate() {
        if (this._potentialEndDate) {
            return formatDate(this._potentialEndDate);
        }
        return '';
    }

};

export default CorePeriodOfPerformance;
