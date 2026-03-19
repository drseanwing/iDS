import { Controller, Get, Param, Res, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';

/**
 * Serves a self-contained HTML page that embeds the OpenGRADE decision-aid
 * widget for a given recommendation.  Intended for cross-origin iframe
 * embedding (e.g. in EHR portals, patient-facing websites).
 *
 * Route: GET /embed/decision-aid/:recommendationId
 *
 * CORS headers are set permissively here because embed pages are explicitly
 * designed to be loaded from third-party origins.  Adjust the
 * Access-Control-Allow-Origin value to a whitelist in production.
 */
@ApiTags('Embed')
@Controller('embed')
export class EmbedController {
  /**
   * Returns an HTML page that auto-mounts the OpenGRADE widget.
   * The page loads the widget bundle from the same origin's /widget/ path,
   * configures it with the supplied recommendationId, and handles theming
   * via an optional `?theme=dark` query parameter.
   */
  @Get('decision-aid/:recommendationId')
  @ApiOperation({
    summary: 'Embeddable decision-aid page for a recommendation',
    description:
      'Returns a minimal HTML page containing the OpenGRADE decision-aid widget pre-configured ' +
      'for the given recommendation.  The page is suitable for embedding in an <iframe>.  ' +
      'CORS headers are set so it can be loaded cross-origin.',
  })
  @ApiParam({ name: 'recommendationId', description: 'Recommendation UUID' })
  @ApiResponse({ status: 200, description: 'HTML embed page returned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  getEmbedPage(
    @Param('recommendationId', ParseUUIDPipe) recommendationId: string,
    @Res() res: Response,
  ): void {
    // Allow cross-origin embedding
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    const theme = (res.req as { query?: Record<string, string> }).query?.['theme'] === 'dark'
      ? 'dark'
      : 'light';

    const apiOrigin = process.env['API_PUBLIC_URL'] ?? '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OpenGRADE Decision Aid</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: transparent; }
    body { padding: 8px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  </style>
</head>
<body>
  <div
    data-opengrade-widget
    data-api-url="${apiOrigin}"
    data-recommendation-id="${recommendationId}"
    data-theme="${theme}"
  ></div>
  <script type="module" src="/widget/opengrade-widget.js"></script>
</body>
</html>`;

    res.status(200).send(html);
  }
}
