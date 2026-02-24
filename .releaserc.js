module.exports = {
  branches: [
    'main',
    { name: 'next', prerelease: 'next' }, // prerelease channel (e.g., 1.0.1-next.1)
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    ...(process.env.NPM_PUBLISH === 'true' ? ['@semantic-release/npm'] : []),
    '@semantic-release/github',
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
  ],
};