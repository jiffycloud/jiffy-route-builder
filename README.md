# Jiffy Route Builder

A tiny module (<5KB) to create lightweight API handlers using Node.js with AWS Lambda and API Gateway. Uses another tiny (<2KB) library called [route-recognizer](https://github.com/tildeio/route-recognizer) to match URLs against routing patterns, and forwards requests to handler functions. Written in TypeScript so you have type information available - especially useful to figure out what's available in the request that API Gateway sends to your handler.



## Usage

Install the `jiffy-route-builder` module like any other NPM module:

```
npm install --save-dev jiffy-route-builder
```

Proceed to use in your application.



## Usage Example

```typescript
import { RouteBuilder, ApiGatewayRequest, ApiGatewayResponse } from 'jiffy-route-builder';

function createWidget(request: ApiGatewayRequest): Promise<ApiGatewayResponse> {
  return Promise.resolve({
    status: 200,
    body: `Created widget ${JSON.stringify(request.body)}`
  });
}

function getWidget(request: ApiGatewayRequest, params: { [key: string]: string }): Promise<ApiGatewayResponse> {
  return Promise.resolve({
    status: 200,
    body: {
      id: params[id]
    }
  })
}

let builder = new RouteBuilder();
builder.setCatchAllOptions(true); 
builder.add('/widgets', createWidget, 'POST');
builder.add('/widgets/:id', getWidget);
export var endpoint = builder.build();`
```



## Deploying an API

The route builder is designed to perform the route matching itself for your API, instead of having API Gateway perform the route matching. In order to configure API Gateway to forward all requests to your handler to allow this, you will setup a single proxy resource at the top level: `/{proxy+}`, which forwards all methods to your Lambda handler. Of course, you can do this manually, but we setup a [starter project](https://github.com/jiffycloud/jiffy-route-builder-starter) using the route builder (a [TypeScript version of the starter](https://github.com/jiffycloud/jiffy-route-builder-starter-ts) is also available), together with [webpack](https://webpack.js.org) and the [Serverless Framework](https://serverless.com/framework/docs), and a simple NPM task to deploy.



## Does the job

We have used this module ourselves to create small, self-contained APIs, without having to deal with configuring API Gateway. This method to write Serverless APIs is really convenient but it has some problems.

We would especially not recommend using this method to write large APIs. In that case, you should split out your API into individual functions, and configure API Gateway to route to individual functions instead. Why? Lambda cold start invocations are highly dependent on the size of your deployed code. The larger the bundle is, the longer the cold start time. If your bundle starts getting into 100s of KBs or the MB range, you're probably going to have a bad time.

In addition, remember you are charged for the execution time of your Lambda. If you do a lot of work unnecessary for a particular request, it can be a waste. In our experience though, the bigger problem is the potential size of your bundle when you combine it all.