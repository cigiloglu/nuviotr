const cheerio = require("cheerio-without-node-native");

const MAIN_URL = "https://cinemacity.cc";

const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": MAIN_URL + "/"
};

function extractQuality(url) {
  var low = String(url || "").toLowerCase();

  if (low.indexOf("2160p") !== -1 || low.indexOf("4k") !== -1) {
    return "4K";
  }

  if (low.indexOf("1080p") !== -1) {
    return "1080p";
  }

  if (low.indexOf("720p") !== -1) {
    return "720p";
  }

  if (low.indexOf("480p") !== -1) {
    return "480p";
  }

  return "HD";
}

function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(url) {
  if (!url) {
    return "";
  }

  url = String(url).trim();

  if (url.indexOf("http://") === 0) {
    return url;
  }

  if (url.indexOf("https://") === 0) {
    return url;
  }

  if (url.indexOf("//") === 0) {
    return "https:" + url;
  }

  if (url.indexOf("/") === 0) {
    return MAIN_URL + url;
  }

  return MAIN_URL + "/" + url;
}

function findMedia(html, title) {
  try {
    var $ = cheerio.load(html);

    var target = normalizeTitle(title);
    var result = null;

    $("div.dar-short_item").each(function (i, el) {
      if (result) {
        return;
      }

      var anchor = $(el)
        .find("a")
        .filter(function (idx, a) {
          var href = $(a).attr("href") || "";
          return href.indexOf(".html") !== -1;
        })
        .first();

      if (!anchor.length) {
        return;
      }

      var foundTitle = anchor.text().split("(")[0].trim();
      var normalizedFound = normalizeTitle(foundTitle);

      if (
        normalizedFound === target ||
        normalizedFound.indexOf(target) !== -1 ||
        target.indexOf(normalizedFound) !== -1
      ) {
        result = anchor.attr("href");
      }
    });

    return result;
  } catch (e) {
    console.log("[CinemaCity] search parse error:", String(e));
    return null;
  }
}

function decodeBase64(input) {
  try {
    var chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    var str = String(input).replace(/=+$/, "");

    var output = "";
    var bc = 0;
    var bs = 0;
    var buffer;
    var i = 0;

    while ((buffer = str.charAt(i++))) {
      buffer = chars.indexOf(buffer);

      if (buffer < 0) {
        continue;
      }

      bs = bc % 4 ? bs * 64 + buffer : buffer;

      if (bc++ % 4) {
        output += String.fromCharCode(
          255 & (bs >> (-2 * bc & 6))
        );
      }
    }

    return output;
  } catch (e) {
    return "";
  }
}

function extractFileData(html) {
  try {
    var $ = cheerio.load(html);
    var fileData = null;

    $("script").each(function (i, el) {
      if (fileData) {
        return;
      }

      var script = $(el).html();

      if (!script || script.indexOf("atob") === -1) {
        return;
      }

      var regex = /atob\s*\(\s*(['"])(.*?)\1\s*\)/g;
      var match;

      while ((match = regex.exec(script)) !== null) {
        var decoded = decodeBase64(match[2]);

        if (!decoded) {
          continue;
        }

        var fileMatch =
          decoded.match(/file\s*:\s*(['"])(.*?)\1/s) ||
          decoded.match(/file\s*:\s*(\[.*?\])/s);

        if (!fileMatch) {
          continue;
        }

        var rawFile = fileMatch[2] || fileMatch[1];

        try {
          fileData = JSON.parse(
            rawFile.replace(/\\(.)/g, "$1")
          );
        } catch (e1) {
          try {
            fileData = JSON.parse(rawFile);
          } catch (e2) {
            fileData = rawFile;
          }
        }

        if (fileData) {
          break;
        }
      }
    });

    return fileData;
  } catch (e) {
    console.log("[CinemaCity] file extraction error:", String(e));
    return null;
  }
}

function addStream(streams, url, title, quality) {
  if (!url) {
    return;
  }

  url = absoluteUrl(url);

  if (
    url.indexOf("http://") !== 0 &&
    url.indexOf("https://") !== 0
  ) {
    return;
  }

  var lower = url.toLowerCase();

  var flags = [];

  if (
    lower.indexOf("turkish") !== -1 ||
    lower.indexOf("turkce") !== -1 ||
    lower.indexOf("_tr") !== -1 ||
    lower.indexOf("türkçe") !== -1
  ) {
    flags.push("🇹🇷");
  }

  if (
    lower.indexOf("english") !== -1 ||
    lower.indexOf("_en") !== -1
  ) {
    flags.push("🇺🇸");
  }

  if (lower.indexOf("german") !== -1) {
    flags.push("🇩🇪");
  }

  if (lower.indexOf("french") !== -1) {
    flags.push("🇫🇷");
  }

  if (lower.indexOf("russian") !== -1) {
    flags.push("🇷🇺");
  }

  if (lower.indexOf("italian") !== -1) {
    flags.push("🇮🇹");
  }

  if (lower.indexOf("spanish") !== -1) {
    flags.push("🇪🇸");
  }

  if (lower.indexOf("arabic") !== -1) {
    flags.push("🇸🇦");
  }

  if (lower.indexOf("hindi") !== -1) {
    flags.push("🇮🇳");
  }

  var finalQuality = quality || extractQuality(url);

  var language =
    flags.length > 0
      ? flags.join("")
      : "Orijinal";

  streams.push({
    name: "CinemaCity [" + language + "]",
    title: String(title || "CinemaCity") + " - " + finalQuality,
    url: url,
    quality: finalQuality,
    headers: {
      "Referer": MAIN_URL + "/",
      "User-Agent": HEADERS["User-Agent"]
    }
  });
}

function processFile(streams, fileData, title) {
  if (!fileData) {
    return;
  }

  if (typeof fileData === "string") {
    addStream(
      streams,
      fileData,
      title,
      extractQuality(fileData)
    );

    return;
  }

  if (Array.isArray(fileData)) {
    fileData.forEach(function (item) {
      if (!item) {
        return;
      }

      if (typeof item === "string") {
        addStream(
          streams,
          item,
          title,
          extractQuality(item)
        );

        return;
      }

      if (item.file) {
        if (
          typeof item.file === "string" &&
          item.file.indexOf("[") !== -1
        ) {
          item.file.split(",").forEach(function (part) {
            var match = part.match(/^\[(.*?)\](.*)$/);

            if (match) {
              addStream(
                streams,
                match[2].trim(),
                title,
                match[1].trim()
              );
            } else {
              addStream(
                streams,
                part.trim(),
                title,
                extractQuality(part)
              );
            }
          });
        } else {
          addStream(
            streams,
            item.file,
            title,
            extractQuality(item.file)
          );
        }
      }
    });
  }
}

function getStreams(tmdbId, mediaType, season, episode) {
  console.log(
    "[CinemaCity] getStreams:",
    tmdbId,
    mediaType,
    season,
    episode
  );

  if (!tmdbId) {
    return Promise.resolve([]);
  }

  var tmdbType =
    mediaType === "tv" ? "tv" : "movie";

  var tmdbUrl =
    "https://api.themoviedb.org/3/" +
    tmdbType +
    "/" +
    encodeURIComponent(tmdbId) +
    "?api_key=" +
    encodeURIComponent(TMDB_API_KEY);

  return fetch(tmdbUrl)
    .then(function (response) {
      if (!response.ok) {
        throw new Error(
          "TMDB HTTP " + response.status
        );
      }

      return response.json();
    })
    .then(function (media) {
      var title =
        media.title ||
        media.name;

      if (!title) {
        return [];
      }

      console.log(
        "[CinemaCity] TMDB title:",
        title
      );

      var searchUrl =
        MAIN_URL +
        "/index.php?do=search&subaction=search&story=" +
        encodeURIComponent(title);

      return fetch(searchUrl, {
        headers: HEADERS
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error(
              "CinemaCity search HTTP " +
                response.status
            );
          }

          return response.text();
        })
        .then(function (html) {
          return {
            title: title,
            html: html
          };
        });
    })
    .then(function (data) {
      var mediaUrl = findMedia(
        data.html,
        data.title
      );

      if (mediaUrl) {
        return {
          title: data.title,
          mediaUrl: absoluteUrl(mediaUrl)
        };
      }

      return fetch(MAIN_URL, {
        headers: HEADERS
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error(
              "CinemaCity home HTTP " +
                response.status
            );
          }

          return response.text();
        })
        .then(function (homeHtml) {
          return {
            title: data.title,
            mediaUrl: absoluteUrl(
              findMedia(
                homeHtml,
                data.title
              )
            )
          };
        });
    })
    .then(function (data) {
      if (!data.mediaUrl) {
        console.log(
          "[CinemaCity] Film bulunamadı:",
          data.title
        );

        return [];
      }

      return fetch(data.mediaUrl, {
        headers: HEADERS
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error(
              "CinemaCity page HTTP " +
                response.status
            );
          }

          return response.text();
        })
        .then(function (pageHtml) {
          return {
            title: data.title,
            pageHtml: pageHtml
          };
        });
    })
    .then(function (data) {
      if (!data.pageHtml) {
        return [];
      }

      var fileData =
        extractFileData(
          data.pageHtml
        );

      if (!fileData) {
        console.log(
          "[CinemaCity] Stream verisi bulunamadı"
        );

        return [];
      }

      var streams = [];

      /*
       * FILM
       */
      if (mediaType === "movie") {
        processFile(
          streams,
          fileData,
          data.title
        );

        return streams;
      }

      /*
       * DIZI
       */
      if (mediaType === "tv" && Array.isArray(fileData)) {
        var selectedSeason = null;

        fileData.some(function (s) {
          if (!s || !s.title) {
            return false;
          }

          var stitle =
            String(s.title).toLowerCase();

          var sn =
            String(season || "");

          if (
            stitle.indexOf(
              "season " + sn
            ) !== -1 ||
            stitle.indexOf(
              "s" + sn
            ) !== -1
          ) {
            selectedSeason = s;
            return true;
          }

          return false;
        });

        if (
          selectedSeason &&
          Array.isArray(
            selectedSeason.folder
          )
        ) {
          var selectedEpisode = null;

          selectedSeason.folder.some(
            function (e) {
              if (!e || !e.title) {
                return false;
              }

              var etitle =
                String(
                  e.title
                ).toLowerCase();

              var en =
                String(episode || "");

              if (
                etitle.indexOf(
                  "episode " + en
                ) !== -1 ||
                etitle.indexOf(
                  "e" + en
                ) !== -1
              ) {
                selectedEpisode = e;
                return true;
              }

              return false;
            }
          );

          if (
            selectedEpisode &&
            selectedEpisode.file
          ) {
            processFile(
              streams,
              selectedEpisode.file,
              data.title +
                " S" +
                season +
                "E" +
                episode
            );
          }
        }

        return streams;
      }

      return [];
    })
    .catch(function (error) {
      console.log(
        "[CinemaCity] ERROR:",
        error && error.message
          ? error.message
          : String(error)
      );

      return [];
    });
}

module.exports = {
  getStreams: getStreams
};
