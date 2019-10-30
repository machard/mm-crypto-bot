import _ from 'lodash';

export const cloneFn = (obj) => {
  if (!_.isArray(obj) && !_.isObject(obj))
    return obj;

  if (_.isArray(obj))
    obj = _.without(obj, null, undefined);

  return _[_.isArray(obj) ? 'map' : 'mapValues'](obj, (v) => {
    if (v && v.toJS)
      return cloneFn(v.toJS());
    else if (parseFloat(v) == v)
      return parseFloat(v.toString());
    else
      return cloneFn(v);
  });
};

export const keysFn = (object, path = '') =>
  _.map(object, (value, key) => {
    const newPath = `${path}${path ? '.' : ''}${key}`;

    if (!_.isObject(value))
      return newPath;

    return keysFn(value, newPath);
  });

export const flatten = (data) => {
  data = cloneFn(data);
  if (_.isArray(data))
    data = _.assign.apply(_, [{}].concat(data));

  return _.reduce(_.flattenDeep(keysFn(data)), (values, column) => {
    values[column.replace(/\./g, '-')] = _.get(data, column);
    return values;
  }, {});
};

const startTime = Date.now();
export const runningHours = () =>
  parseFloat(((Date.now() - startTime) / 1000 / 60 / 60).toFixed(2));
