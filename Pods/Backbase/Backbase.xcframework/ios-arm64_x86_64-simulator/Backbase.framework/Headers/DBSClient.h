//
//  DBSClient.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 19/07/2017.
//  Copyright © 2017 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
@protocol DBSDataProvider;

@protocol DBSClient <NSObject>
@property (strong, nonatomic, nullable) NSObject<DBSDataProvider>* dataProvider;
@property (strong, nonatomic, nonnull) NSURL* baseURL;
@end
