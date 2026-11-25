export function redact(value: string, secrets: string[]): string {
  let next = value;
  for (const secret of secrets) {
    if (secret && secret.length >= 6) next = next.split(secret).join("••••");
  }
  return next;
}

export function secretValues(env: Record<string, string | undefined>): string[] {
  return [
    env.OPENAI_API_KEY,
    env.ANTHROPIC_API_KEY,
    env.OLLAMA_API_KEY,
    env.JIRA_API_TOKEN,
    env.JIRA_EMAIL,
    env.LINEAR_API_KEY,
    env.GITHUB_TOKEN,
    env.NOTION_TOKEN,
    env.SLACK_BOT_TOKEN,
  ].filter((value): value is string => Boolean(value));
}

export function redactHeaders(headers: Record<string, string>, secrets: string[]): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (/authorization/i.test(key)) {
      next[key] = value.startsWith("Basic ") ? "Basic ••••" : "Bearer ••••";
      continue;
    }
    next[key] = redact(value, secrets);
  }
  return next;
}
