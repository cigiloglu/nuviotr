function getStreams(tmdbId, mediaType, season, episode) {
  return Promise.resolve([
    {
      name: "MoOnCrOwN TEST",
      title: "TEST STREAM",
      url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      quality: "1080p"
    }
  ]);
}

module.exports = { getStreams };
