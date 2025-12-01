#!/usr/bin/env node
/**
 * YoRHa Agent CLI - Interact with ACE (Autonomous Coding Engine)
 * Usage: node tools/yorha-agent.mjs <session_id> <message> [--execute]
 */

import fetch from 'node-fetch';
import { program } from 'commander';
import chalk from 'chalk';

const ACE_BASE = process.env.ACE_BASE || 'http://localhost:8000/api/ace';

program
  .name('yorha-agent')
  .description('YoRHa Agent CLI for ACE')
  .version('1.0.0');

program
  .command('tools')
  .description('List available tools')
  .action(async () => {
    try {
      const resp = await fetch(`${ACE_BASE}/tools`);
      const data = await resp.json();

      console.log(chalk.cyan('\n📦 Available Tools:\n'));
      for (const [name, desc] of Object.entries(data.tools)) {
        console.log(chalk.yellow(`  ${name}`));
        console.log(chalk.gray(`    ${desc}\n`));
      }
      console.log(chalk.cyan(`Total: ${data.count} tools\n`));
    } catch (err) {
      console.error(chalk.red('Error:'), err.message);
      process.exit(1);
    }
  });

program
  .command('plan <session_id> <message>')
  .description('Plan next action without executing')
  .option('-r, --role <role>', 'Agent role', 'warden')
  .action(async (sessionId, message, options) => {
    try {
      const resp = await fetch(`${ACE_BASE}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: message,
          role: options.role
        })
      });

      const data = await resp.json();

      console.log(chalk.cyan('\n🤖 ACE Plan:\n'));
      console.log(chalk.yellow('Tool:'), chalk.white(data.tool));
      console.log(chalk.yellow('Args:'), chalk.white(JSON.stringify(data.args, null, 2)));
      console.log(chalk.yellow('Reasoning:'), chalk.white(data.reasoning));
      console.log(chalk.yellow('ACA Marker:'), chalk.gray(data.aca_marker));
      console.log();
    } catch (err) {
      console.error(chalk.red('Error:'), err.message);
      process.exit(1);
    }
  });

program
  .command('execute <session_id> <message>')
  .description('Plan and execute action')
  .option('-r, --role <role>', 'Agent role', 'warden')
  .action(async (sessionId, message, options) => {
    try {
      console.log(chalk.cyan('\n🚀 Planning and executing...\n'));

      const resp = await fetch(`${ACE_BASE}/plan-and-execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: message,
          role: options.role
        })
      });

      const data = await resp.json();

      console.log(chalk.cyan('📋 Plan:'));
      console.log(chalk.yellow('  Tool:'), chalk.white(data.tool));
      console.log(chalk.yellow('  Args:'), chalk.white(JSON.stringify(data.args, null, 2)));
      console.log(chalk.yellow('  Reasoning:'), chalk.white(data.reasoning));
      console.log();

      console.log(chalk.cyan('⚡ Execution:'));
      if (data.execution_result.success) {
        console.log(chalk.green('  ✅ Success'));
        console.log(chalk.yellow('  Result:'));
        console.log(chalk.white(JSON.stringify(data.execution_result.result, null, 2)));
      } else {
        console.log(chalk.red('  ❌ Failed'));
        console.log(chalk.red('  Error:'), data.execution_result.error);
      }
      console.log();
    } catch (err) {
      console.error(chalk.red('Error:'), err.message);
      process.exit(1);
    }
  });

program
  .command('session <session_id>')
  .description('Get session summary')
  .action(async (sessionId) => {
    try {
      const resp = await fetch(`${ACE_BASE}/session/${sessionId}`);
      const data = await resp.json();

      console.log(chalk.cyan('\n📊 Session Summary:\n'));
      console.log(chalk.yellow('Session ID:'), chalk.white(data.session_id));
      console.log(chalk.yellow('Goal:'), chalk.white(data.goal));
      console.log(chalk.yellow('Progress:'), chalk.white(`${(data.progress * 100).toFixed(1)}%`));
      console.log(chalk.yellow('Actions Taken:'), chalk.white(data.actions_taken));
      console.log(chalk.yellow('Created:'), chalk.gray(data.created_at));

      if (data.last_action) {
        console.log(chalk.cyan('\n📝 Last Action:'));
        console.log(chalk.yellow('  Tool:'), chalk.white(data.last_action.tool));
        console.log(chalk.yellow('  Args:'), chalk.white(JSON.stringify(data.last_action.args)));
        console.log(chalk.yellow('  Reasoning:'), chalk.white(data.last_action.reasoning));
      }
      console.log();
    } catch (err) {
      console.error(chalk.red('Error:'), err.message);
      process.exit(1);
    }
  });

program
  .command('reset <session_id>')
  .description('Reset session state')
  .action(async (sessionId) => {
    try {
      const resp = await fetch(`${ACE_BASE}/session/${sessionId}/reset`, {
        method: 'POST'
      });
      const data = await resp.json();

      if (data.success) {
        console.log(chalk.green(`\n✅ Session ${sessionId} reset\n`));
      }
    } catch (err) {
      console.error(chalk.red('Error:'), err.message);
      process.exit(1);
    }
  });

// Interactive mode
program
  .command('interactive <session_id>')
  .alias('i')
  .description('Interactive mode')
  .action(async (sessionId) => {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('yorha> ')
    });

    console.log(chalk.cyan('\n🤖 YoRHa Agent Interactive Mode'));
    console.log(chalk.gray(`Session: ${sessionId}`));
    console.log(chalk.gray('Type "exit" to quit, "help" for commands\n'));

    rl.prompt();

    rl.on('line', async (line) => {
      const input = line.trim();

      if (input === 'exit') {
        console.log(chalk.gray('\nGoodbye!\n'));
        rl.close();
        process.exit(0);
      }

      if (input === 'help') {
        console.log(chalk.cyan('\nCommands:'));
        console.log(chalk.yellow('  plan <message>') + chalk.gray(' - Plan action'));
        console.log(chalk.yellow('  exec <message>') + chalk.gray(' - Plan and execute'));
        console.log(chalk.yellow('  status') + chalk.gray(' - Show session status'));
        console.log(chalk.yellow('  tools') + chalk.gray(' - List available tools'));
        console.log(chalk.yellow('  exit') + chalk.gray(' - Quit\n'));
        rl.prompt();
        return;
      }

      if (input.startsWith('plan ')) {
        const message = input.slice(5);
        try {
          const resp = await fetch(`${ACE_BASE}/plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, message })
          });
          const data = await resp.json();
          console.log(chalk.yellow('\nTool:'), chalk.white(data.tool));
          console.log(chalk.yellow('Args:'), chalk.white(JSON.stringify(data.args)));
          console.log(chalk.yellow('Reasoning:'), chalk.white(data.reasoning));
          console.log();
        } catch (err) {
          console.error(chalk.red('Error:'), err.message);
        }
      } else if (input.startsWith('exec ')) {
        const message = input.slice(5);
        try {
          const resp = await fetch(`${ACE_BASE}/plan-and-execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, message })
          });
          const data = await resp.json();
          console.log(chalk.green('\n✅ Executed:'), chalk.white(data.tool));
          if (data.execution_result.success) {
            console.log(chalk.yellow('Result:'), chalk.white(JSON.stringify(data.execution_result.result, null, 2)));
          } else {
            console.log(chalk.red('Error:'), data.execution_result.error);
          }
          console.log();
        } catch (err) {
          console.error(chalk.red('Error:'), err.message);
        }
      } else if (input === 'status') {
        try {
          const resp = await fetch(`${ACE_BASE}/session/${sessionId}`);
          const data = await resp.json();
          console.log(chalk.cyan('\nSession:'), chalk.white(data.session_id));
          console.log(chalk.yellow('Progress:'), chalk.white(`${(data.progress * 100).toFixed(1)}%`));
          console.log(chalk.yellow('Actions:'), chalk.white(data.actions_taken));
          console.log();
        } catch (err) {
          console.error(chalk.red('Error:'), err.message);
        }
      } else if (input === 'tools') {
        try {
          const resp = await fetch(`${ACE_BASE}/tools`);
          const data = await resp.json();
          console.log(chalk.cyan('\nAvailable tools:'));
          for (const name of Object.keys(data.tools)) {
            console.log(chalk.yellow(`  - ${name}`));
          }
          console.log();
        } catch (err) {
          console.error(chalk.red('Error:'), err.message);
        }
      } else if (input) {
        // Default: execute
        try {
          const resp = await fetch(`${ACE_BASE}/plan-and-execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, message: input })
          });
          const data = await resp.json();
          console.log(chalk.green('\n✅'), chalk.white(data.tool));
          console.log(chalk.gray(data.reasoning));
          console.log();
        } catch (err) {
          console.error(chalk.red('Error:'), err.message);
        }
      }

      rl.prompt();
    });
  });

program.parse();
