'use strict';

const expect = require('chai').expect;
const Parser = require('../').Parser;


describe('Commands Parsing', function() {
  let parser = null;
  let oldExit = null;
  before(function() {
    oldExit = process.exit;
    process.exit = function() {};
  });
  after(function() {
    process.exit = oldExit;
  });
  // ignore the parser trying to exit by default
  describe('Command callbacks', function() {
    it('Command level callback executes after its options callbaks', function() {
      parser = new Parser({printer: function() {}, allowProcessExit: false});
      const calledCallbacks = [];
      function registerCalledCallback() {
        calledCallbacks.push(this.name);
      }
      parser.addOptions([
        {name: 'option1', type: 'boolean', callback: registerCalledCallback},
        {name: 'option2', type: 'boolean', callback: registerCalledCallback}
      ]);
      const cmd = parser.addCommand({name: 'hello', callback: registerCalledCallback});
      cmd.addOptions([
        {name: 'option3', type: 'boolean', callback: registerCalledCallback},
        {name: 'option4', type: 'boolean', callback: registerCalledCallback}
      ]);
      parser.parse(['--option1', '--option2', 'hello', '--option4', '--option3']);
      expect(calledCallbacks).to.eql(['option1', 'option2', 'option4', 'option3', 'hello']);
    });
  });
  describe('Simple Command with arguments', function() {
    let cmd = null;
    beforeEach(function() {
      parser = new Parser({printer: function() {}, allowProcessExit: false});
      cmd = parser.addCommand({
        name: 'hello', minArgs: 1, maxArgs: 2, namedArgs: ['former', 'latter']}, [
          {name: 'verbose', type: 'boolean'}
        ]);
    });

    it('Parse basic command', function() {
      parser.parse(['hello', '--verbose', 'juanjo', 'beltran']);
      expect(cmd.providedArguments).to.eql(['juanjo', 'beltran']);
      const expected = {verbose: true};
      expect(cmd.getFlattenOptions()).to.eql({verbose: true});

      // Including help built-on option
      expected.help = false;
      expect(cmd.getFlattenOptions({includeHelp: true})).to.eql(expected);
      expect(cmd.arguments).to.eql({former: 'juanjo', latter: 'beltran'});
    });
    it('Breaks on unknown flags', function() {
      expect(function() {
        parser.parse(['hello', '--foo', 'bar']);
      }).to.throw(Error, 'Unknown flag: --foo');
    });
  });
  describe('Simple Command without arguments', function() {
    let cmd = null;
    beforeEach(function() {
      parser = new Parser({printer: function() {}, allowProcessExit: false});
      cmd = parser.addCommand({
        name: 'hello'
      }, [
        {name: 'who'},
        {name: 'verbose', type: 'boolean'}
      ]);
    });

    it('Parse basic command', function() {
      parser.parse(['hello', '--verbose', '--who', 'juanjo']);
      expect(cmd.providedArguments).to.eql([]);
      const expected = {verbose: true, who: 'juanjo'};
      expect(cmd.getFlattenOptions()).to.eql(expected);
      // Including help built-on option
      expected.help = false;
      expect(cmd.getFlattenOptions({includeHelp: true})).to.eql(expected);
    });
    it('By default, captures extra arguments', function() {
      parser.parse(['hello', 'juanjo']);
      expect(cmd.extraArgs).to.eql(['juanjo']);
    });
    it('It stops parsing after the first unknown argument non-flag (non-starting by --)', function() {
      parser.parse(['hello', 'juanjo', '--who', 'beltran']);
      expect(cmd.extraArgs).to.eql(['juanjo', '--who', 'beltran']);
    });
  });
});
