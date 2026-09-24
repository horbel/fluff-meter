# Security

Please report vulnerabilities privately through
[GitHub security advisories](https://github.com/horbel/fluff-meter/security/advisories/new)
rather than a public issue.

Things we care about most:

- anything that exposes the user's API key to LinkedIn's page, another extension or a third party;
- markup or script injection through post text or API responses (badges are built with DOM APIs,
  never `innerHTML`);
- requests to any host other than the provider the user chose.
