import RouteRecognizer from 'route-recognizer';
import { getRequestHeader } from './request-helpers';

export interface ApiGatewayRequest {
    body: string;
    resource: string;
    requestContext: {
        resourceId: string;
        apiId: string;
        resourcePath: string;
        httpMethod: string;
        requestId: string;
        accountId: string;
        identity: {
            apiKey: string;
            userArn: string;
            cognitoAuthenticationType: string;
            caller: string;
            userAgent: string;
            user: string;
            cognitoIdentityPoolId: string;
            cognitoIdentityId: string;
            cognitoAuthenticationProvider: string;
            sourceIp: string;
            accountId: string;
        },
        stage: string;
    };
    queryStringParameters: { [key: string]: string; };
    headers: { [key: string]: string; };
    pathParameters: { [key: string]: string; };
    httpMethod: string;
    stageVariables: { [key: string]: string; };
    path: string;
}

export interface ApiGatewayResponse {
    status: number;
    body?: any;
    headers?: { [name: string]: string };
}

export interface HandlerFn {
    (event?: ApiGatewayRequest, values?: { [key: string]: string }): Promise<ApiGatewayResponse>;
}

let sendResponse = function (callback: Function, response: ApiGatewayResponse) {
    console.log(response.body);
    if (response.body) {
        if (typeof response.body == 'object') {
            response.body = JSON.stringify(response.body);
        }
    } else {
        response.body = undefined;
    }

    response.headers = response.headers || {};

    response.headers['Access-Control-Allow-Origin'] = '*';

    callback(null, {
        statusCode: response.status,
        body: response.body,
        headers: response.headers
    });
};

let sendCORSResponse = function (request: ApiGatewayRequest, callback: Function) {
    let allowHeaders = getRequestHeader(request, 'access-control-request-headers')

    callback(null, {
        statusCode: 200,
        body: '',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PATCH,',
            'Access-Control-Allow-Headers': allowHeaders,
            'Content-Type': 'application/json'
        }
    });
};

let handleError = function (callback: Function, errResponse: ApiGatewayResponse | string) {
    console.log(errResponse);
    if (typeof errResponse === 'string') {
        errResponse = {
            status: 500,
            body: errResponse
        };
    }
    else if (!errResponse.status) {
        console.log('Sending default error response for error ', errResponse);
        errResponse.status = 500;
    }
    
    sendResponse(callback, errResponse);
};

export class RouteBuilder {
    private recognizers: { [method: string]: RouteRecognizer } = {};
    private catchAllOptions: boolean = false;

    public add(path: string, handler: HandlerFn, method: string = 'GET') {
        if (!this.recognizers[method]) {
            this.recognizers[method] = new RouteRecognizer();
        }

        this.recognizers[method].add([{ path: path, handler: handler }]);
    }

    public setCatchAllOptions (catchAllOptions: boolean) {
        this.catchAllOptions = catchAllOptions;
    }

    public build() {
        return (event: ApiGatewayRequest, context: any, callback: Function): any => {
            console.log(`Handling ${event.httpMethod} ${event.path}`);
            if (event.httpMethod === 'OPTIONS' && this.catchAllOptions) {
                return sendCORSResponse(event, callback);
            }

            let recognizer: RouteRecognizer = this.recognizers[event.httpMethod];

            if (!recognizer) {
                recognizer = this.recognizers['ANY'];
                if (!recognizer) {
                    console.log(`No routes for request method ${event.httpMethod} exist`);
                    return sendResponse(callback, { status: 404 });
                }
            }

            let recognized = recognizer.recognize(event.path),
                firstRoute = recognized !== undefined && recognized[0];
                
            if (firstRoute) {
                console.log(`Routing to handler for ${event.httpMethod} ${event.path}, with parameters ${JSON.stringify(firstRoute.params)}`);

                let handler: Promise<ApiGatewayResponse> = (firstRoute.handler as HandlerFn).apply(firstRoute.handler, [event, firstRoute.params]);
                if (handler && handler.then) {
                    return handler.then(
                        response => sendResponse(callback, response),
                        error => handleError(callback, error)
                    );
                }
            }
            else {
                console.log(`No route found for ${event.httpMethod} ${event.path}`);
                return sendResponse(callback, { status: 404 });
            }
        };
    }
}
