import {
  true_default
} from "./chunk-UWMOYZ25.js";
import "./chunk-KWPVD4H7.js";

// node_modules/@sveltejs/kit/src/exports/internal/index.js
var HttpError = class {
  /**
   * @param {number} status
   * @param {{message: string} extends App.Error ? (App.Error | string | undefined) : App.Error} body
   */
  constructor(status, body) {
    this.status = status;
    if (typeof body === "string") {
      this.body = { message: body };
    } else if (body) {
      this.body = body;
    } else {
      this.body = { message: `Error: ${status}` };
    }
  }
  toString() {
    return JSON.stringify(this.body);
  }
};
var Redirect = class {
  /**
   * @param {300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308} status
   * @param {string} location
   */
  constructor(status, location) {
    this.status = status;
    this.location = location;
  }
};
var ActionFailure = class {
  /**
   * @param {number} status
   * @param {T} data
   */
  constructor(status, data) {
    this.status = status;
    this.data = data;
  }
};

// node_modules/@sveltejs/kit/src/runtime/pathname.js
var DATA_SUFFIX = "/__data.json";
var HTML_DATA_SUFFIX = ".html__data.json";
function has_data_suffix(pathname) {
  return pathname.endsWith(DATA_SUFFIX) || pathname.endsWith(HTML_DATA_SUFFIX);
}
function add_data_suffix(pathname) {
  if (pathname.endsWith(".html")) return pathname.replace(/\.html$/, HTML_DATA_SUFFIX);
  return pathname.replace(/\/$/, "") + DATA_SUFFIX;
}
function strip_data_suffix(pathname) {
  if (pathname.endsWith(HTML_DATA_SUFFIX)) {
    return pathname.slice(0, -HTML_DATA_SUFFIX.length) + ".html";
  }
  return pathname.slice(0, -DATA_SUFFIX.length);
}
var ROUTE_SUFFIX = "/__route.js";
function has_resolution_suffix(pathname) {
  return pathname.endsWith(ROUTE_SUFFIX);
}
function add_resolution_suffix(pathname) {
  return pathname.replace(/\/$/, "") + ROUTE_SUFFIX;
}
function strip_resolution_suffix(pathname) {
  return pathname.slice(0, -ROUTE_SUFFIX.length);
}

// node_modules/@sveltejs/kit/src/version.js
var VERSION = "2.27.3";

// node_modules/@sveltejs/kit/src/exports/index.js
function error(status, body) {
  if ((!true_default || true_default) && (isNaN(status) || status < 400 || status > 599)) {
    throw new Error(`HTTP error status codes must be between 400 and 599 — ${status} is invalid`);
  }
  throw new HttpError(status, body);
}
function isHttpError(e, status) {
  if (!(e instanceof HttpError)) return false;
  return !status || e.status === status;
}
function redirect(status, location) {
  if ((!true_default || true_default) && (isNaN(status) || status < 300 || status > 308)) {
    throw new Error("Invalid status code");
  }
  throw new Redirect(
    // @ts-ignore
    status,
    location.toString()
  );
}
function isRedirect(e) {
  return e instanceof Redirect;
}
function json(data, init) {
  const body = JSON.stringify(data);
  const headers = new Headers(init == null ? void 0 : init.headers);
  if (!headers.has("content-length")) {
    headers.set("content-length", encoder.encode(body).byteLength.toString());
  }
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return new Response(body, {
    ...init,
    headers
  });
}
var encoder = new TextEncoder();
function text(body, init) {
  const headers = new Headers(init == null ? void 0 : init.headers);
  if (!headers.has("content-length")) {
    const encoded = encoder.encode(body);
    headers.set("content-length", encoded.byteLength.toString());
    return new Response(encoded, {
      ...init,
      headers
    });
  }
  return new Response(body, {
    ...init,
    headers
  });
}
function fail(status, data) {
  return new ActionFailure(status, data);
}
function isActionFailure(e) {
  return e instanceof ActionFailure;
}
function normalizeUrl(url) {
  url = new URL(url, "http://internal");
  const is_route_resolution = has_resolution_suffix(url.pathname);
  const is_data_request = has_data_suffix(url.pathname);
  const has_trailing_slash = url.pathname !== "/" && url.pathname.endsWith("/");
  if (is_route_resolution) {
    url.pathname = strip_resolution_suffix(url.pathname);
  } else if (is_data_request) {
    url.pathname = strip_data_suffix(url.pathname);
  } else if (has_trailing_slash) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return {
    url,
    wasNormalized: is_data_request || is_route_resolution || has_trailing_slash,
    denormalize: (new_url = url) => {
      new_url = new URL(new_url, url);
      if (is_route_resolution) {
        new_url.pathname = add_resolution_suffix(new_url.pathname);
      } else if (is_data_request) {
        new_url.pathname = add_data_suffix(new_url.pathname);
      } else if (has_trailing_slash && !new_url.pathname.endsWith("/")) {
        new_url.pathname += "/";
      }
      return new_url;
    }
  };
}
export {
  VERSION,
  error,
  fail,
  isActionFailure,
  isHttpError,
  isRedirect,
  json,
  normalizeUrl,
  redirect,
  text
};
//# sourceMappingURL=@sveltejs_kit.js.map
