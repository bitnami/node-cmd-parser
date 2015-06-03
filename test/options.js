'use strict';
const _ = require('lodash');
const expect = require('chai').expect;
const Parser = require('../').Parser;

describe('Options Parsing', function() {
  let parser = null;

  beforeEach(function() {
    parser = new Parser({printer: function() {}, allowProcessExit: false});
  });
  describe('Option callbacks', function() {
    it('Callbacks execute in order of parsing', function() {
      let calledCallbacks = [];
      function registerCalledOption() {
        calledCallbacks.push(this.name);
      }
      parser.addOptions([
        {name: 'option1', type: 'boolean', callback: registerCalledOption},
        {name: 'option2', type: 'boolean', callback: registerCalledOption}
      ]);
      parser.parse(['--option1', '--option2']);
      expect(calledCallbacks).to.eql(['option1', 'option2']);
      calledCallbacks = [];
      parser.parse(['--option2', '--option1']);
      expect(calledCallbacks).to.eql(['option2', 'option1']);
    });
  });
  describe('Multiple Options Parsing', function() {
    beforeEach(function() {
      parser = new Parser({printer: function() {}, allowProcessExit: false});
    });
    const sampleOpts = [
      {name: 'bar', type: 'boolean'},
      {name: 'prefix', 'default': '/opt/bitnami'},
      {name: 'log-level', type: 'choice', allowedValues: ['info', 'debug', 'error']}
    ];

    it('Reports options through getFlattenOptions', function() {
      parser.addOptions(sampleOpts);

      parser.parse([]);

      expect(parser.getFlattenOptions()).to.eql({bar: false, prefix: '/opt/bitnami', 'log-level': 'info'});
    });
    it('Can return a camel-cased version of the options through getFlattenOptions', function() {
      parser.addOptions(sampleOpts);

      parser.parse([]);

      expect(parser.getFlattenOptions({camelize: true}))
        .to.eql({bar: false, prefix: '/opt/bitnami', 'logLevel': 'info'});
    });

    it('Does not return the built-in help option by default, but can be instructed to do so', function() {
      parser.addOptions(sampleOpts);

      parser.parse([]);
      let expected = {bar: false, prefix: '/opt/bitnami', 'log-level': 'info'};
      expect(parser.getFlattenOptions()).to.eql(expected);
      expected.help = false;
      expect(parser.getFlattenOptions({includeHelp: true})).to.eql(expected);

      expected = {bar: false, prefix: '/opt/bitnami', 'logLevel': 'info'};
      expect(parser.getFlattenOptions({camelize: true})).to.eql(expected);

      expected.help = false;
      expect(parser.getFlattenOptions({camelize: true, includeHelp: true})).to.eql(expected);
    });


    it('Reports options through getFlattenOptions with different configurations', function() {
      parser.addOptions(sampleOpts);

      parser.parse([]);

      let expected = {bar: false, prefix: '/opt/bitnami', 'log-level': 'info'};
      expect(parser.getFlattenOptions()).to.eql(expected);

      // Including help built-on option
      expected.help = false;
      expect(parser.getFlattenOptions({includeHelp: true})).to.eql(expected);

      parser.parse(['--bar', '--prefix=/tmp', '--log-level=error']);
      expected = {bar: true, prefix: '/tmp', 'log-level': 'error'};
      expect(parser.getFlattenOptions()).to.eql(expected);
      expected.help = false;
      expect(parser.getFlattenOptions({includeHelp: true})).to.eql(expected);
      expected = {bar: true, prefix: '/tmp', 'logLevel': 'error'};
      expect(parser.getFlattenOptions({camelize: true})).to.eql(expected);
      expected.help = false;
      expect(parser.getFlattenOptions({camelize: true, includeHelp: true})).to.eql(expected);
    });
  });

  describe('Boolean Options', function() {
    it('Parse boolean', function() {
      parser.addOption({name: 'bar', type: 'boolean'});

      parser.parse([]);
      expect(parser.getOptionValue('bar')).to.eql(false);

      parser.parse(['--bar']);
      expect(parser.getOptionValue('bar')).to.eql(true);

      parser.parse(['--no-bar']);
      expect(parser.getOptionValue('bar')).to.eql(false);
    });
    it('Booleans support extra value', function() {
      parser.addOption({name: 'bar', type: 'boolean'});
      _.each(['0', 'false', 'False', 'no', 'NO'], function(value) {
        parser.parse([`--bar=${value}`]);
        expect(parser.getOptionValue('bar')).to.eql(false);
      });

      _.each(['1', 'true', 'True', 'yes', 'Yes'], function(value) {
        parser.parse([`--bar=${value}`]);
        expect(parser.getOptionValue('bar')).to.eql(true);
      });
    });
    it('Allow forbidding negate form', function() {
      parser.addOption({name: 'bar', type: 'boolean', allowNegated: false});

      parser.parse([]);
      expect(parser.getOptionValue('bar')).to.eql(false);

      parser.parse(['--bar']);
      expect(parser.getOptionValue('bar')).to.eql(true);
      expect(function() {
        parser.parse(['--no-bar']);
      }).to.throw(Error, 'Unknown flag: --no-bar');
    });
  });

  describe('String Options', function() {
    it('Parse string', function() {
      parser.addOption({name: 'foo'});

      parser.parse([]);
      expect(parser.getOptionValue('foo')).to.eql('');

      parser.parse(['--foo', 'bar']);
      expect(parser.getOptionValue('foo')).to.equal('bar');

      parser.parse(['--foo=bar2']);
      expect(parser.getOptionValue('foo')).to.equal('bar2');
    });

    it('Break if no value is provided', function() {
      parser.addOption({name: 'foo'});
      expect(function() {
        parser.parse(['--foo']);
      }).to.throw(Error, 'Option \'foo\' requires a value');
    });

    it('Negate only works for booleans', function() {
      parser.addOption({name: 'foo', allowNegated: true});
      parser.parse([]);
      expect(function() {
        parser.parse(['--no-foo', 'bar']);
      }).to.throw(Error, 'Unknown flag: --no-foo');
    });
  });

  describe('Choice Options', function() {
    it('Parse choice', function() {
      parser.addOption({name: 'foo', type: 'choice', allowedValues: ['a', 'b', 'c']});
      parser.parse(['--foo', 'b']);
      expect(parser.getOptionValue('foo')).to.be.equal('b');
      parser.parse(['--foo=c']);
      expect(parser.getOptionValue('foo')).to.be.equal('c');
    });

    it('Break if an invalid value is provided', function() {
      parser.addOption({name: 'foo', type: 'choice', allowedValues: ['a', 'b', 'c']});
      expect(function() {
        parser.parse(['--foo', 'd']);
      }).to.throw(Error, '\'d\' is not a valid value for \'foo\'. Allowed: a, b, c');
    });

    it('Break if no allowed values are provided', function() {
      parser.addOption({name: 'foo', type: 'choice'});
      expect(function() {
        parser.parse(['--foo', 'a']);
      }).to.throw(Error, 'Choice \'foo\' does not allow any valid value');
    });
  });
});
