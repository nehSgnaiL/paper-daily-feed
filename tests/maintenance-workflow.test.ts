import { readFileSync } from "node:fs";

import { describe, expect, it } from "bun:test";

describe("maintenance workflow guidance", () => {
  it("explains how to configure workflow-file sync when workflow updates are skipped", () => {
    const workflow = readFileSync(".github/workflows/maintenance.yml", "utf8");

    expect(workflow).toContain("### What to do next");
    expect(workflow).toContain("1. Open this token page: https://github.com/settings/personal-access-tokens/new");
    expect(workflow).toContain("3. Give the token these repository permissions: **Contents: Read and write** and **Workflows: Read and write**.");
    expect(workflow).toContain("6. Set **Name** to \\`MAINTENANCE_SYNC_TOKEN\\`.");
    expect(workflow).toContain("9. Click **Run workflow**.");
    expect(workflow).toContain("Expected result: the next run says **Auto-sync completed** and your fork \\`main\\` has no extra sync commit.");
  });

  it("rebases fork commits on top of upstream when users customize main", () => {
    const workflow = readFileSync(".github/workflows/maintenance.yml", "utf8");

    expect(workflow).toContain("git merge-base --is-ancestor upstream/main origin/main");
    expect(workflow).toContain("git rebase upstream/main");
    expect(workflow).toContain("with your custom commits replayed on top");
  });

  it("emails actionable guidance only when a sync needs manual action", () => {
    const workflow = readFileSync(".github/workflows/maintenance.yml", "utf8");

    expect(workflow).toContain("id: sync");
    expect(workflow).toContain('set_manual_action "workflow-permission"');
    expect(workflow).toContain('set_manual_action "rebase-conflict"');
    expect(workflow).toContain('set_manual_action "push-failed"');
    expect(workflow).toContain("bun src/index.ts notify-maintenance");
    expect(workflow).toContain("steps.sync.outputs.manual_reason != ''");
    expect(workflow).toContain("MAINTENANCE_REASON:");
    expect(workflow).toContain("RECEIVER: ${{ secrets.RECEIVER }}");
  });

  it("supports an explicit maintenance email test without pretending sync failed", () => {
    const workflow = readFileSync(".github/workflows/maintenance.yml", "utf8");

    expect(workflow).toContain("send_test_notification:");
    expect(workflow).toContain("manual_reason=test");
    expect(workflow).toContain("github.repository != 'nehSgnaiL/paper-daily-feed' && !inputs.send_test_notification");
  });
});
