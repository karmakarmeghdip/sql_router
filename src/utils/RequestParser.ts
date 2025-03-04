class RequestParser {
  parseQueryParams(url: string): Record<string, string> {
    const queryParams: Record<string, string> = {};
    const queryString = url.split('?')[1];

    if (!queryString) return queryParams;

    const params = new URLSearchParams(queryString);
    params.forEach((value, key) => {
      queryParams[key] = value;
    });

    return queryParams;
  }
}

export { RequestParser };