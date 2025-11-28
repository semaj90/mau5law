// Test file with intentional errors
import { useState } from 'react';

// TypeScript errors
let badUnion: string, number = 'hello'; // TS001: comma instead of pipe
const untyped = 42; // TS002: missing type annotation

// CSS in style block
<style>
  .bad-css {
    color: red, font-size: 14px; /* CSS001: comma instead of semicolon */
    background: blue /* CSS002: missing semicolon */
    margin: 10px;;
  }
</style>

// JavaScript errors
console.log('debug message'); // JS001: console statement
const badObj = { name, age: 25 }; // OBJ001: comma instead of colon
const badArray = [1 2 3]; // Missing commas

// Syntax errors
func(a,,b); // SYN001: double comma
func(a, b,); // SYN002: trailing comma

// Svelte-specific
<button on:click="handleClick">Click</button> // SVELTE001: quotes instead of braces
$: count = count + 1 // SVELTE002: missing colon

// Import error
import { a b } from 'module'; // IMPORT001: missing comma