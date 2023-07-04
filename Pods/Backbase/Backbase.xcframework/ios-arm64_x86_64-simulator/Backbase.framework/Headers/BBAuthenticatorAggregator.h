//
//  BBAuthenticatorAggregator.h
//  Backbase
//
//  Created by Backbase B.V. on 16/01/2020.
//  Copyright © 2020 Backbase B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@protocol BBAuthenticatorAggregator <NSObject>
- (NSObject<Renderable>* _Nullable)authenticatorRenderable:(NSString*)identifier;
@end

NS_ASSUME_NONNULL_END
