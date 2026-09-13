/**
 * CinemaCity - MoOnCrOwN Edition
 * Nuvio Provider
 * TMDB ID -> CinemaCity -> Stream
 */

var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;

var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
      })
    : (obj[key] = value);

var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) {
    if (__hasOwnProp.call(b, prop)) {
      __defNormalProp(a, prop, b[prop]);
    }
  }

  if (__getOwnPropSymbols) {
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) {
        __defNormalProp(a, prop, b[prop]);
      }
    }
  }

  return a;
};

var __spreadProps = (a, b) =>
  __defProps(a, __getOwnPropDescs(b));

var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };

    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };

    var step = (x) => {
      if (x.done) {
        resolve(x.value);
      } else {
        Promise.resolve(x.value).then(fulfilled, rejected);
      }
    };

    step(
      (generator = generator.apply(__this, __arguments)).next()
    );
  });
};

/* Nuvio HTML parser */
const cheerio = require("cheerio-without-node-native");

/* CinemaCity */
const MAIN_URL = "https://cinemacity.cc";

/* TMDB */
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

/* HTTP headers */
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Referer": MAIN_URL + "/"
};

/* Base64 decoder */
const atobPolyfill = (str) => {
  try {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    let output = "";

    str = String(str).replace(/[=]+$/, "");

    if (str.length % 4 === 1) {
      return "";
    }

    for (
      let bc = 0, bs = 0, buffer, i = 0;
      (buffer = str.charAt(i++));
      ~buffer &&
      (bs = bc % 4
        ? bs * 64 + buffer
        : buffer,
      bc++ % 4)
        ? (output += String.fromCharCode(
            255 & (bs >> (-2 * bc & 6))
          ))
        : 0
    ) {
      buffer = chars.indexOf(buffer);
    }

    return output;
  } catch (e) {
    return "";
  }
};

/* Quality */
function extractQuality(url) {
  const low = (url || "").toLowerCase();

  if (
    low.includes("2160p") ||
    low.includes("4k")
  ) {
    return "4K";
  }

  if (low.includes("1080p")) {
    return "1080p";
  }

  if (low.includes("720p")) {
    return "720p";
  }

  if (low.includes("480p")) {
    return "480p";
  }

  return "HD";
}

/* Normalize title */
function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[^\w\sğüşöçıİĞÜŞÖÇ-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* Search CinemaCity */
function findMediaInHtml(html, targetTitle) {
  try {
    const $ = cheerio.load(html);

    const normalizedTarget = normalizeTitle(targetTitle);

    let found = null;

    $("div.dar-short_item").each((i, el) => {
      if (found) {
        return;
      }

      const anchor = $(el)
        .find("a")
        .filter((idx, a) =>
          ($(a).attr("href") || "").includes(".html")
        )
        .first();

      if (!anchor.length) {
        return;
      }

      const href = anchor.attr("href");

      const rawTitle = anchor
        .text()
        .split("(")[0]
        .trim();

      const normalizedFound = normalizeTitle(rawTitle);

      if (
        normalizedFound === normalizedTarget ||
        normalizedFound.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedFound)
      ) {
        found = href;
      }
    });

    return found;
  } catch (error) {
    console.log(
      "[CinemaCity] Search parse error:",
      error && error.message
        ? error.message
        : String(error)
    );

    return null;
  }
}

/* Convert relative URL */
function makeAbsoluteUrl(url) {
  if (!url) {
    return null;
  }

  if (url.startsWith("http://")) {
    return url;
  }

  if (url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("//")) {
    return "https:" + url;
  }

  if (url.startsWith("/")) {
    return MAIN_URL + url;
  }

  return MAIN_URL + "/" + url;
}

/* Main provider */
async function getStreams(
  tmdbId,
  mediaType,
  season,
  episode
) {
  console.log(
    "[CinemaCity] Request:",
    mediaType,
    tmdbId,
    season,
    episode
  );

  try {
    if (!tmdbId) {
      console.log("[CinemaCity] TMDB ID yok");
      return [];
    }

    if (
      mediaType !== "movie" &&
      mediaType !== "tv"
    ) {
      console.log(
        "[CinemaCity] Desteklenmeyen medya tipi:",
        mediaType
      );

      return [];
    }

    /*
     * 1. TMDB bilgisi
     */
    const tmdbEndpoint =
      mediaType === "tv"
        ? "tv"
        : "movie";

    const tmdbUrl =
      "https://api.themoviedb.org/3/" +
      tmdbEndpoint +
      "/" +
      encodeURIComponent(tmdbId) +
      "?api_key=" +
      encodeURIComponent(TMDB_API_KEY);

    const tmdbRes = await fetch(tmdbUrl);

    if (!tmdbRes.ok) {
      console.log(
        "[CinemaCity] TMDB HTTP:",
        tmdbRes.status
      );

      return [];
    }

    const mediaInfo = await tmdbRes.json();

    const mediaTitle =
      mediaInfo.title ||
      mediaInfo.name;

    if (!mediaTitle) {
      console.log(
        "[CinemaCity] TMDB title bulunamadı"
      );

      return [];
    }

    console.log(
      "[CinemaCity] TMDB title:",
      mediaTitle
    );

    /*
     * 2. CinemaCity araması
     */
    const searchUrl =
      MAIN_URL +
      "/index.php?do=search&subaction=search&story=" +
      encodeURIComponent(mediaTitle);

    console.log(
      "[CinemaCity] Search:",
      searchUrl
    );

    const searchRes = await fetch(
      searchUrl,
      {
        headers: HEADERS
      }
    );

    if (!searchRes.ok) {
      console.log(
        "[CinemaCity] Search HTTP:",
        searchRes.status
      );

      return [];
    }

    const searchHtml =
      await searchRes.text();

    let mediaUrl = findMediaInHtml(
      searchHtml,
      mediaTitle
    );

    /*
     * 3. Aramada bulunamazsa ana sayfayı dene
     */
    if (!mediaUrl) {
      console.log(
        "[CinemaCity] Search sonucu yok, ana sayfa deneniyor"
      );

      const homeRes = await fetch(
        MAIN_URL,
        {
          headers: HEADERS
        }
      );

      if (homeRes.ok) {
        const homeHtml =
          await homeRes.text();

        mediaUrl = findMediaInHtml(
          homeHtml,
          mediaTitle
        );
      }
    }

    if (!mediaUrl) {
      console.log(
        "[CinemaCity] İçerik bulunamadı:",
        mediaTitle
      );

      return [];
    }

    mediaUrl =
      makeAbsoluteUrl(mediaUrl);

    console.log(
      "[CinemaCity] Content URL:",
      mediaUrl
    );

    /*
     * 4. İçerik sayfası
     */
    const pageRes = await fetch(
      mediaUrl,
      {
        headers: __spreadProps(
          __spreadValues({}, HEADERS),
          {
            Referer:
              MAIN_URL + "/"
          }
        )
      }
    );

    if (!pageRes.ok) {
      console.log(
        "[CinemaCity] Content HTTP:",
        pageRes.status
      );

      return [];
    }

    const pageHtml =
      await pageRes.text();

    const $page =
      cheerio.load(pageHtml);

    let fileData = null;

    /*
     * 5. Base64 / atob içinden file bul
     */
    $page("script").each(
      (i, el) => {
        if (fileData) {
          return;
        }

        const scriptHtml =
          $page(el).html();

        if (
          !scriptHtml ||
          !scriptHtml.includes("atob")
        ) {
          return;
        }

        const regex =
          /atob\s*\(\s*(['"])(.*?)\1\s*\)/g;

        let match;

        while (
          (match = regex.exec(scriptHtml)) !== null
        ) {
          const decoded =
            atobPolyfill(match[2]);

          if (!decoded) {
            continue;
          }

          const fileMatch =
            decoded.match(
              /file\s*:\s*(['"])(.*?)\1/s
            ) ||
            decoded.match(
              /file\s*:\s*(\[.*?\])/s
            );

          if (!fileMatch) {
            continue;
          }

          let rawFile =
            fileMatch[2] ||
            fileMatch[1];

          if (!rawFile) {
            continue;
          }

          try {
            fileData =
              JSON.parse(
                rawFile.replace(
                  /\\(.)/g,
                  "$1"
                )
              );
          } catch (e) {
            try {
              fileData =
                JSON.parse(rawFile);
            } catch (e2) {
              fileData = rawFile;
            }
          }

          if (fileData) {
            break;
          }
        }
      }
    );

    if (!fileData) {
      console.log(
        "[CinemaCity] file verisi bulunamadı"
      );

      return [];
    }

    /*
     * 6. Stream listesi
     */
    const streams = [];

    const langMap = [
      {
        key: "turkish",
        flag: "🇹🇷"
      },
      {
        key: "_tr",
        flag: "🇹🇷"
      },
      {
        key: "turkce",
        flag: "🇹🇷"
      },
      {
        key: "türkçe",
        flag: "🇹🇷"
      },
      {
        key: "english",
        flag: "🇺🇸"
      },
      {
        key: "_en",
        flag: "🇺🇸"
      },
      {
        key: "german",
        flag: "🇩🇪"
      },
      {
        key: "french",
        flag: "🇫🇷"
      },
      {
        key: "russian",
        flag: "🇷🇺"
      },
      {
        key: "italian",
        flag: "🇮🇹"
      },
      {
        key: "spanish",
        flag: "🇪🇸"
      },
      {
        key: "arabic",
        flag: "🇸🇦"
      },
      {
        key: "hindi",
        flag: "🇮🇳"
      }
    ];

    function addStream(
      url,
      title,
      quality
    ) {
      if (!url) {
        return;
      }

      url =
        makeAbsoluteUrl(
          String(url).trim()
        );

      if (!url) {
        return;
      }

      if (
        !url.startsWith("http://") &&
        !url.startsWith("https://")
      ) {
        return;
      }

      const urlLower =
        url.toLowerCase();

      const flags = [];

      langMap.forEach(
        (item) => {
          if (
            urlLower.includes(
              item.key
            )
          ) {
            if (
              !flags.includes(
                item.flag
              )
            ) {
              flags.push(
                item.flag
              );
            }
          }
        }
      );

      const audioCount =
        (
          url.match(/\.m4a/gi) ||
          []
        ).length;

      const finalQuality =
        quality ||
        extractQuality(url);

      let infoLabel = "";

      if (audioCount > 1) {
        infoLabel =
          "Multi: " +
          audioCount +
          " " +
          flags.join("");
      } else if (
        flags.length > 0
      ) {
        infoLabel =
          flags.join("");
      } else {
        infoLabel =
          "Orijinal";
      }

      streams.push({
        name:
          "CinemaCity [" +
          infoLabel +
          "]",

        title:
          String(title || mediaTitle) +
          " - " +
          finalQuality,

        url: url,

        quality:
          finalQuality,

        headers: {
          "User-Agent":
            HEADERS["User-Agent"],
          "Referer":
            MAIN_URL + "/"
        }
      });
    }

    /*
     * 7. File string işleme
     */
    function processStr(
      str,
      label
    ) {
      if (!str) {
        return;
      }

      if (
        typeof str !== "string"
      ) {
        return;
      }

      /*
       * [1080p]URL,[720p]URL
       */
      if (
        str.includes("[") &&
        str.includes("]")
      ) {
        const parts =
          str.split(",");

        parts.forEach(
          (part) => {
            const trimmed =
              part.trim();

            const match =
              trimmed.match(
                /^\[(.*?)\](.*)$/
              );

            if (match) {
              addStream(
                match[2].trim(),
                label,
                match[1].trim()
              );
            } else {
              addStream(
                trimmed,
                label,
                extractQuality(
                  trimmed
                )
              );
            }
          }
        );
      } else {
        addStream(
          str.trim(),
          label,
          extractQuality(str)
        );
      }
    }

    /*
     * 8. Film
     */
    if (
      mediaType === "movie"
    ) {
      if (
        Array.isArray(fileData)
      ) {
        fileData.forEach(
          (item) => {
            if (
              item &&
              item.file
            ) {
              processStr(
                item.file,
                mediaTitle
              );
            }
          }
        );
      } else if (
        typeof fileData ===
        "string"
      ) {
        processStr(
          fileData,
          mediaTitle
        );
      }
    }

    /*
     * 9. Dizi
     */
    else {
      if (
        Array.isArray(fileData)
      ) {
        let seasonObject =
          null;

        fileData.some(
          (s) => {
            if (
              !s ||
              !s.title
            ) {
              return false;
            }

            const title =
              String(
                s.title
              ).toLowerCase();

            const seasonNumber =
              String(
                season || ""
              );

            if (
              title.includes(
                "season " +
                  seasonNumber
              ) ||
              title.includes(
                "s" +
                  seasonNumber
              )
            ) {
              seasonObject =
                s;

              return true;
            }

            return false;
          }
        );

        if (
          seasonObject &&
          Array.isArray(
            seasonObject.folder
          )
        ) {
          let episodeObject =
            null;

          seasonObject.folder.some(
            (e) => {
              if (
                !e ||
                !e.title
              ) {
                return false;
              }

              const title =
                String(
                  e.title
                ).toLowerCase();

              const episodeNumber =
                String(
                  episode || ""
                );

              if (
                title.includes(
                  "episode " +
                    episodeNumber
                ) ||
                title.includes(
                  "e" +
                    episodeNumber
                )
              ) {
                episodeObject =
                  e;

                return true;
              }

              return false;
            }
          );

          if (
            episodeObject &&
            episodeObject.file
          ) {
            processStr(
              episodeObject.file,
              mediaTitle +
                " S" +
                season +
                "E" +
                episode
            );
          }
        }
      }
    }

    console.log(
      "[CinemaCity] Streams:",
      streams.length
    );

    return streams;

  } catch (error) {
    console.log(
      "[CinemaCity] ERROR:",
      error &&
      error.message
        ? error.message
        : String(error)
    );

    return [];
  }
}

module.exports = {
  getStreams
};
