#!/usr/bin/env node

import { exec } from "child_process";
import { promisify } from "util";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";

const execAsync = promisify(exec);

async function checkProject() {
  console.log("🔍 SvelteKit Project Health Check\n");
  console.log("=".repeat(50));

  // Check if dependencies are installed
  console.log("\n📦 Checking dependencies...");
  if (!existsSync("node_modules")) {
    console.log("❌ node_modules not found! Run: npm install");
    return;
  } else {
    console.log("✅ Dependencies installed");
  }

  // Check for .svelte-kit
  console.log("\n🔧 Checking SvelteKit sync...");
  if (!existsSync(".svelte-kit")) {
    console.log("❌ .svelte-kit not found! Run: npm run prepare");
  } else {
    console.log("✅ SvelteKit synced");
  }

  // Run type check and analyze output
  console.log("\n📝 Running type check...");
  try {
    const { stdout, stderr } = await execAsync("npm run check", {
      maxBuffer: 1024 * 1024 * 10,
    });
    const output = stdout + stderr;

    // Count errors by type
    const errors = {
      typeNotFound: (output.match(/Cannot find name '[^']+'/g) || []).length,
      propertyNotExist: (output.match(/Property '[^']+' does not exist/g) || [])
        .length,
      importNotFound: (output.match(/Cannot find module/g) || []).length,
      other: 0,
    };

    const totalErrors = Object.values(errors).reduce((a, b) => a + b, 0);

    console.log("\n📊 Error Summary:");
    console.log("=".repeat(30));
    console.log(`Type not found:     ${errors.typeNotFound}`);
    console.log(`Property errors:    ${errors.propertyNotExist}`);
    console.log(`Import errors:      ${errors.importNotFound}`);
    console.log(`Other errors:       ${errors.other}`);
    console.log("=".repeat(30));
    console.log(`Total errors:       ${totalErrors}`);

    // Save detailed report
    await writeFile("error-analysis.txt", output);
    console.log("\n💾 Detailed error report saved to: error-analysis.txt");

    // Provide recommendations
    console.log("\n💡 Recommendations:");
    if (errors.typeNotFound > 0) {
      console.log("- Run: node comprehensive-fix.mjs");
    }
    if (errors.propertyNotExist > 0) {
      console.log("- Run: node fix-all-typescript-errors.mjs");
    }
    if (errors.importNotFound > 0) {
      console.log("- Run: node fix-imports.mjs");
    }

    if (totalErrors === 0) {
      console.log("🎉 No errors found! Your project is clean!");
    } else if (totalErrors < 10) {
      console.log("\n✨ Almost there! Just a few errors left to fix manually.");
    } else if (totalErrors < 50) {
      console.log(
        "\n📈 Good progress! Run MASTER-FIX-ALL.bat to fix most remaining issues.",
      );
    } else {
      console.log(
        "\n🚨 Many errors found. Run MASTER-FIX-ALL.bat to fix them automatically.",
      );
    }
  } catch (error) {
    console.error("❌ Type check failed with error:", error.message);
    console.log(
      "\nThis is normal if there are many errors. Run the fix scripts!",
    );
  }

  // Check for common issues
  console.log("\n🔍 Checking for common issues...");

  const filesToCheck = [
    { path: "src/app.css", desc: "Main CSS file" },
    { path: "src/app.d.ts", desc: "TypeScript declarations" },
    { path: "src/lib/types/user.ts", desc: "User types" },
    { path: "uno.config.ts", desc: "UnoCSS config" },
  ];

  for (const file of filesToCheck) {
    if (existsSync(file.path)) {
      console.log(`✅ ${file.desc} exists`);
    } else {
      console.log(`❌ ${file.desc} missing at ${file.path}`);
    }
  }

  // Check for NieR theme
  console.log("\n🎨 Checking NieR theme...");
  if (existsSync("src/routes/nier-showcase/+page.svelte")) {
    console.log("✅ NieR showcase page exists");
    console.log(
      "   Visit http://localhost:5173/nier-showcase to see the theme!",
    );
  } else {
    console.log("⚠️  NieR showcase not found");
  }

  console.log("\n" + "=".repeat(50));
  console.log("✨ Health check complete!\n");
}

// Run the check
checkProject().catch(console.error);
