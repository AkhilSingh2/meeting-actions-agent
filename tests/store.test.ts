import { describe, expect, it } from "vitest";
import { chooseEngine } from "@/lib/env";
import { outcomeFromLlm } from "@/lib/llm/normalize";
import { parseTranscript } from "@/lib/parse";
import { freshState, removeMeeting, restoreSamples, upsertMeeting } from "@/lib/store/memory";
import { contrastRatio } from "@/lib/design/contrast";
import { textPairs, themes } from "@/lib/design/tokens";

describe("local records", () => {
  it("restores a removed sample and keeps a meeting the user added", () => {
    const today = "2026-11-25";
    let state = freshState(today);
    state = removeMeeting(state, "field-notes");
    expect(state.meetings.some((meeting) => meeting.id === "field-notes")).toBe(false);
    state = upsertMeeting(state, {
      ...state.meetings[0]!,
      id: "user-1",
      title: "My notes",
      sample: false,
    });
    state = restoreSamples(state, today);
    expect(state.meetings.some((meeting) => meeting.id === "field-notes")).toBe(true);
    expect(state.meetings.some((meeting) => meeting.id === "user-1")).toBe(true);
  });
});

describe("engine choice", () => {
  it("stays on the heuristic in demo mode even when a key is present", () => {
    const choice = chooseEngine(
      { DEMO_MODE: "true", OPENAI_API_KEY: "sk-test", LLM_MODEL: "any", LLM_PROVIDER: "openai" },
      "llm",
    );
    expect(choice.engine).toBe("heuristic");
    expect(choice.notice).toMatch(/Demo mode/i);
  });

  it("uses the model only outside demo mode when a model id and key exist", () => {
    const choice = chooseEngine(
      { DEMO_MODE: "false", OPENAI_API_KEY: "sk-test", LLM_MODEL: "any", LLM_PROVIDER: "openai" },
      "auto",
    );
    expect(choice.engine).toBe("llm");
  });
});

describe("llm normalization", () => {
  it("drops unknown cue ids and lowers confidence when a citation is missing", () => {
    const transcript = parseTranscript("Mina Cole: I'll send the notes by Friday.\nOwen Park: We decided to wait.");
    const outcome = outcomeFromLlm(
      {
        decisions: [{ text: "Wait.", cueIds: ["c2"] }],
        actions: [
          { text: "Send the notes", owner: "Mina Cole", dueDate: "Friday", confidence: 0.9, cueIds: ["missing"] },
        ],
        questions: [],
        risks: [],
      },
      transcript,
      { title: "Notes", meetingDate: "2026-03-03", model: "test/model" },
    );
    expect(outcome.engine).toBe("llm");
    expect(outcome.actions[0]?.citations).toEqual([]);
    expect(outcome.actions[0]?.confidence).toBeLessThan(0.9);
    expect(outcome.actions[0]?.dueDate).toBe("2026-03-06");
    expect(outcome.decisions[0]?.citations[0]?.cueId).toBe("c2");
    expect(outcome.warnings.some((warning) => warning.includes("unknown citation"))).toBe(true);
  });
});

describe("contrast", () => {
  it("keeps text pairs at WCAG AA", () => {
    for (const theme of ["light", "dark"] as const) {
      for (const [foreground, background] of textPairs) {
        const ratio = contrastRatio(themes[theme][foreground], themes[theme][background]);
        expect(ratio, `${theme} ${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
