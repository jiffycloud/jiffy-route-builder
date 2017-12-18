import { ApiGatewayRequest } from './jiffy-route-builder';

export function getRequestHeader (request: ApiGatewayRequest, header: string): string {
    for (var key in request.headers) {
        if (key.toLowerCase() === header.toLowerCase()) {
            return request.headers[key];
        }
    }

    return '';
}
