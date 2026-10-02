export default {
  fetch(request, env) {
    const { pathname, search } = new URL(request.url);
    return fetch(new Request(env.BACKEND_URL + pathname + search, request));
  },
};
