(function () {
    var app;
    
    app = angular.module("ngQuickDate", []);
    
    app.provider("ngQuickDateDefaults", function () {
        return {
            options: {
                dateFormat: 'M/d/yyyy',
                timeFormat: 'h:mm a',
                labelFormat: null,
                placeholder: 'Click to Set Date',
                hoverText: null,
                buttonIconHtml: "<i class='fa fa-calendar'></i>",//null,
                closeButtonHtml: '&times;',
                nextLinkHtml: "<i class='fa fa-chevron-right'></i>",//'Next &rarr;',
                prevLinkHtml: "<i class='fa fa-chevron-left'></i>", //'&larr; Prev',
                disableTimepicker: false,
                disableClearButton: false,
                defaultTime: null,
                dayAbbreviations: ["Su", "M", "Tu", "W", "Th", "F", "Sa"],
                dateFilter: null,
                wsDateFormat: 'yyyy-MM-dd',
                parseDateFunction: function (str) {
                    var seconds;
                    seconds = Date.parse(str);
                    if (isNaN(seconds)) {
                        return null;
                    } else {
                        return new Date(seconds);
                    }
                }
            },
            $get: function () {
                return this.options;
            },
            set: function (keyOrHash, value) {
                var k, v, _results;
                if (typeof keyOrHash === 'object') {
                    _results = [];
                    for (k in keyOrHash) {
                        v = keyOrHash[k];
                        _results.push(this.options[k] = v);
                    }
                    return _results;
                } else {
                    return this.options[keyOrHash] = value;
                }
            }
        };
    });
    
    app.directive("quickDatepicker", [
        'ngQuickDateDefaults', '$filter', '$sce', '$http', '$q', '$window', function (ngQuickDateDefaults, $filter, $sce, $http, $q, $window) {
            return {
                restrict: "E",
                require: "?ngModel",
                scope: {
                    dateFilter: '=?',
                    onChange: "&",
                    required: '@'
                },
                replace: true,
                link: function (scope, element, attrs, ngModelCtrl) {
                    var dateToString, datepickerClicked, datesAreEqual, datesAreEqualToMinute, getDaysInMonth, initialize, parseDateString, refreshView, setCalendarDate, setConfigOptions, setInputFieldValues, setupCalendarView, stringToDate;
                    initialize = function () {
                        setConfigOptions();
                        scope.toggleCalendar(false);
                        scope.inputDate = null;
                        scope.inputTime = null;
                        scope.invalid = true;
                        scope.weeks = [];
                        scope.workweeks = [];
                        if (typeof attrs.initValue === 'string') {
                            ngModelCtrl.$setViewValue(attrs.initValue);
                        }
                        setCalendarDate();
                        return refreshView();
                    };
                    setConfigOptions = function () {
                        var key, value;
                        for (key in ngQuickDateDefaults) {
                            value = ngQuickDateDefaults[key];
                            if (key.match(/[Hh]tml/)) {
                                scope[key] = $sce.trustAsHtml(ngQuickDateDefaults[key] || "");
                            } else if (!scope[key] && attrs[key]) {
                                scope[key] = attrs[key];
                            } else if (!scope[key]) {
                                scope[key] = ngQuickDateDefaults[key];
                            }
                        }
                        if (!scope.labelFormat) {
                            scope.labelFormat = scope.dateFormat;
                            if (!scope.disableTimepicker) {
                                scope.labelFormat += " " + scope.timeFormat;
                            }
                        }
                        if (attrs.iconClass && attrs.iconClass.length) {
                            return scope.buttonIconHtml = $sce.trustAsHtml("<i ng-show='iconClass' class='" + attrs.iconClass + "'></i>");
                        }
                        scope.wwDateRequestFormat = scope.wsDateFormat;
                    };
                    datepickerClicked = false;
                    window.document.addEventListener('click', function (event) {
                        if (scope.calendarShown && !datepickerClicked) {
                            scope.toggleCalendar(false);
                            scope.$apply();
                        }
                        return datepickerClicked = false;
                    });
                    angular.element(element[0])[0].addEventListener('click', function (event) {
                        return datepickerClicked = true;
                    });
                    refreshView = function () {
                        var date;
                        date = ngModelCtrl.$modelValue ? parseDateString(ngModelCtrl.$modelValue) : null;
                        setupCalendarView();
                        setInputFieldValues(date);
                        scope.mainButtonStr = date ? $filter('date')(date, scope.labelFormat) : scope.placeholder;
                        return scope.invalid = ngModelCtrl.$invalid;
                    };
                    setInputFieldValues = function (val) {
                        if (val != null) {
                            scope.inputDate = $filter('date')(val, scope.dateFormat);
                            return scope.inputTime = $filter('date')(val, scope.timeFormat);
                        } else {
                            scope.inputDate = null;
                            return scope.inputTime = null;
                        }
                    };
                    setCalendarDate = function (val) {
                        var d;
                        if (val == null) {
                            val = null;
                        }
                        d = val != null ? new Date(val) : new Date();
                        if (d.toString() === "Invalid Date") {
                            d = new Date();
                        }
                        d.setDate(1);
                        return scope.calendarDate = new Date(d);
                    };
                    setupCalendarView = function () {
                        var curDate, d, day, daysInMonth, numRows, offset, row, selected, time, today, weeks, _i, _j, _ref;
                        var workweeks; 
                        offset = scope.calendarDate.getDay();
                        daysInMonth = getDaysInMonth(scope.calendarDate.getFullYear(), scope.calendarDate.getMonth());
                        numRows = Math.ceil((offset + daysInMonth) / 7);
                        weeks = [];
                        workweeks = []; 
                        curDate = new Date(scope.calendarDate);
                        curDate.setDate(curDate.getDate() + (offset * -1));
                        for (row = _i = 0, _ref = numRows - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; row = 0 <= _ref ? ++_i : --_i) {
                            weeks.push([]);
                            for (day = _j = 0; _j <= 6; day = ++_j) {
                                
                                
                                if (row === 0 && day === 0) {    
                                    scope.populateWorkWeekLabel(curDate);
                                }
                                 
                                d = new Date(curDate);
                                if (scope.defaultTime) {
                                    time = scope.defaultTime.split(':');
                                    d.setHours(time[0] || 0);
                                    d.setMinutes(time[1] || 0);
                                    d.setSeconds(time[2] || 0);
                                }
                                selected = ngModelCtrl.$modelValue && d && datesAreEqual(d, ngModelCtrl.$modelValue);
                                today = datesAreEqual(d, new Date());
                                weeks[row].push({
                                    date: d,
                                    selected: selected,
                                    disabled: typeof scope.dateFilter === 'function' ? !scope.dateFilter(d) : false,
                                    other: d.getMonth() !== scope.calendarDate.getMonth(),
                                    today: today
                                });
                                curDate.setDate(curDate.getDate() + 1);
                            }
                            
                            //push workweek label
                            selected = true;
                            workweeks.push({
                                ww: '',
                                selected: selected
                            });
                        }
                        scope.workweeks = workweeks; 
                        
                        return scope.weeks = weeks;
                    };
                    ngModelCtrl.$parsers.push(function (viewVal) {
                        if (scope.required && (viewVal == null)) {
                            ngModelCtrl.$setValidity('required', false);
                            return null;
                        } else if (angular.isDate(viewVal)) {
                            ngModelCtrl.$setValidity('required', true);
                            return viewVal;
                        } else if (angular.isString(viewVal)) {
                            ngModelCtrl.$setValidity('required', true);
                            return scope.parseDateFunction(viewVal);
                        } else {
                            return null;
                        }
                    });
                    ngModelCtrl.$formatters.push(function (modelVal) {
                        if (angular.isDate(modelVal)) {
                            return modelVal;
                        } else if (angular.isString(modelVal)) {
                            return scope.parseDateFunction(modelVal);
                        } else {
                            return void 0;
                        }
                    });
                    dateToString = function (date, format) {
                        return $filter('date')(date, format);
                    };
                    stringToDate = function (date) {
                        if (typeof date === 'string') {
                            return parseDateString(date);
                        } else {
                            return date;
                        }
                    };
                    parseDateString = ngQuickDateDefaults.parseDateFunction;
                    datesAreEqual = function (d1, d2, compareTimes) {
                        if (compareTimes == null) {
                            compareTimes = false;
                        }
                        if (compareTimes) {
                            return (d1 - d2) === 0;
                        } else {
                            d1 = stringToDate(d1);
                            d2 = stringToDate(d2);
                            return d1 && d2 && (d1.getYear() === d2.getYear()) && (d1.getMonth() === d2.getMonth()) && (d1.getDate() === d2.getDate());
                        }
                    };
                    datesAreEqualToMinute = function (d1, d2) {
                        if (!(d1 && d2)) {
                            return false;
                        }
                        return parseInt(d1.getTime() / 60000) === parseInt(d2.getTime() / 60000);
                    };
                    getDaysInMonth = function (year, month) {
                        return [31, ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
                    };
                    ngModelCtrl.$render = function () {
                        setCalendarDate(ngModelCtrl.$viewValue);
                        return refreshView();
                    };
                    ngModelCtrl.$viewChangeListeners.unshift(function () {
                        setCalendarDate(ngModelCtrl.$viewValue);
                        refreshView();
                        if (scope.onChange) {
                            return scope.onChange();
                        }
                    });
                    scope.$watch('calendarShown', function (newVal, oldVal) {
                        var dateInput;
                        if (newVal) {
                            dateInput = angular.element(element[0].querySelector(".quickdate-date-input"))[0];
                            return dateInput.select();
                        }
                    });
                    
                    scope.toggleCalendar = function (show) {
                        if (isFinite(show)) {
                            return scope.calendarShown = show;
                        } else {
                            return scope.calendarShown = !scope.calendarShown;
                        }
                    };
                    scope.selectDate = function (date, closeCalendar) {
                        var changed;
                        if (closeCalendar == null) {
                            closeCalendar = true;
                        }
                        changed = (!ngModelCtrl.$viewValue && date) || (ngModelCtrl.$viewValue && !date) || ((date && ngModelCtrl.$viewValue) && (date.getTime() !== ngModelCtrl.$viewValue.getTime()));
                        if (typeof scope.dateFilter === 'function' && !scope.dateFilter(date)) {
                            return false;
                        }
                        ngModelCtrl.$setViewValue(date);
                        if (closeCalendar) {
                            scope.toggleCalendar(false);
                        }
                        return true;
                    };
                    scope.selectDateFromInput = function (closeCalendar) {
                        var err, tmpDate, tmpDateAndTime, tmpTime;
                        if (closeCalendar == null) {
                            closeCalendar = false;
                        }
                        try {
                            tmpDate = parseDateString(scope.inputDate);
                            if (!tmpDate) {
                                throw 'Invalid Date';
                            }
                            if (!scope.disableTimepicker && scope.inputTime && scope.inputTime.length && tmpDate) {
                                tmpTime = scope.disableTimepicker ? '00:00:00' : scope.inputTime;
                                tmpDateAndTime = parseDateString("" + scope.inputDate + " " + tmpTime);
                                if (!tmpDateAndTime) {
                                    throw 'Invalid Time';
                                }
                                tmpDate = tmpDateAndTime;
                            }
                            if (!datesAreEqualToMinute(ngModelCtrl.$viewValue, tmpDate)) {
                                if (!scope.selectDate(tmpDate, false)) {
                                    throw 'Invalid Date';
                                }
                            }
                            if (closeCalendar) {
                                scope.toggleCalendar(false);
                            }
                            scope.inputDateErr = false;
                            return scope.inputTimeErr = false;
                        } catch (_error) {
                            err = _error;
                            if (err === 'Invalid Date') {
                                return scope.inputDateErr = true;
                            } else if (err === 'Invalid Time') {
                                return scope.inputTimeErr = true;
                            }
                        }
                    };
                    scope.onDateInputTab = function () {
                        if (scope.disableTimepicker) {
                            scope.toggleCalendar(false);
                        }
                        return true;
                    };
                    scope.onTimeInputTab = function () {
                        scope.toggleCalendar(false);
                        return true;
                    };
                    scope.nextMonth = function () {
                        setCalendarDate(new Date(new Date(scope.calendarDate).setMonth(scope.calendarDate.getMonth() + 1)));
                        return refreshView();
                    };
                    scope.prevMonth = function () {
                        setCalendarDate(new Date(new Date(scope.calendarDate).setMonth(scope.calendarDate.getMonth() - 1)));
                        return refreshView();
                    };
                    scope.clear = function () {
                        return scope.selectDate(null, true);
                    };

                    scope.serviceHandlerForWorkWeek = function (res) {
                        //var wk = resultSet[i].ww_full.substr(6);
                        var wk = res.data.workweek.substr(6);
                        var workweeks = [];
                        var selected = true;
                        for (var i = 0; i < scope.workweeks.length; i++) {
                            //push workweek label
                            workweeks.push({
                                ww: Number(wk) + i <= 52 ? Number(wk) + i: 1,    
                                selected: selected
                            });
                        }
                        scope.workweeks = workweeks;
                    };
                    scope.populateWorkWeekLabel = function (curDate) {
                        var str = $window.location.href;
                        var re = /index\.html/gi;
                        //var indexurl = str.replace(re, '');
			var indexurl = 'https://xdi4f4c0u8.execute-api.us-west-2.amazonaws.com/latest/';

                        var reqestWkDate = $filter('date')(curDate, scope.wwDateRequestFormat);
                         
                        //var wsService = attrs.workweekService;
                        var wsService = 'workweek';
                        ///// promise deferr implementation, no callback ////////
                        var originalRequest = $http.get(indexurl + wsService + '/' + reqestWkDate);
                        $q.when(originalRequest)
                          .then(function (res) {
                            scope.serviceHandlerForWorkWeek(res);
                        });
                    };
                     
                    
                    return initialize();
                },
                templateUrl: 'js/ng-quick-date.html'
            };
        }
    ]);
    
    app.directive('ngEnter', function () {
        return function (scope, element, attr) {
            return element.bind('keydown keypress', function (e) {
                if (e.which === 13) {
                    scope.$apply(attr.ngEnter);
                    return e.preventDefault();
                }
            });
        };
    });
    
    app.directive('onTab', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attr) {
                return element.bind('keydown keypress', function (e) {
                    if ((e.which === 9) && !e.shiftKey) {
                        return scope.$apply(attr.onTab);
                    }
                });
            }
        };
    });

}).call(this);
