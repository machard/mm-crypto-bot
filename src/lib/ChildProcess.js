import _ from 'lodash';

var cleanExit = function() { process.exit(); };
process.on('SIGINT', cleanExit); // catch ctrl-c
process.on('SIGTERM', cleanExit); // catch kill

export default class ChildProcess {
  constructor(worker, args) {
    this.worker = worker;
    this.args = args;

    this.handlers = [];

    this.reset();

    process.once('exit', () => {
      console.log('shutdown child on exit');
      this.child.kill();
    });
    process.once('uncaughtException', error => {
      console.log('shutdown child on uerr');
      this.child.kill();

      if (process.listeners('uncaughtException').length === 0)
        throw error;
    });
  }

  reset() {
    const fork = require('child_process').fork;

    const program = this.worker;
    const parameters = [JSON.stringify(this.args)];
    const options = {
      stdio: [ 'pipe', process.stdout, process.stderr, 'ipc' ]
    };

    this.child = fork(program, parameters, options);

    _.each(this.handlers, handler => {
      this.child.on('message', handler);
    });

    this.child.on('close', (code) => {
      console.log('child closseee', this.worker);
      _.each(this.handlers, handler => handler({ lag: true }));
      this.reset();
    });
  }

  onMessage(handler) {
    this.handlers.push(handler);
    this.child.on('message', handler);
  }

  send(message) {
    this.child.send(message);
  }

}
