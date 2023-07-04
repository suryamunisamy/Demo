platform :ios, '14.0'

# The following JFrog artifactory repositories should include
# - https://repo.backbase.com/api/pods/ios3/ (backbase-pods3)
# - https://repo.backbase.com/api/pods/ios-retail3/ (backbase-pods-retail3)
# - https://repo.backbase.com/api/pods/ios-identity/ (ios-identity)
# - https://repo.backbase.com/api/pods/ios-mobile-notifications/ (ios-mobile-notifications)
# - https://repo.backbase.com/api/pods/ios-engagement-channels/ (ios-engagement-channels)
# - https://repo.backbase.com/api/pods/ios-business/ (ios-business)
plugin 'cocoapods-art', sources: %w[
  backbase-pods3
  backbase-pods-retail3
  backbase-pods-identity
  backbase-pods-notifications
  backbase-pods-engagement-channels
  ios-business
]

install! 'cocoapods', deterministic_uuids: false
source 'https://cdn.cocoapods.org/'

use_frameworks!
inhibit_all_warnings!

abstract_target 'Common' do
  # App dependency
  pod 'RetailUSApp', '4.12.0'

  target 'Demo'
end

post_install do |installer_representation|
  update_vg_parallax_pod
  
  installer_representation.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      # Our frameworks are built with library evolution support enabled,
      # and they are linked against dependencies with the same setting.
      config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'YES'
    end
  end
end

def update_vg_parallax_pod
 filename = [Dir.pwd, "Pods", "VGParallaxHeader", "VGParallaxHeader", "UIScrollView+VGParallaxHeader.m"].join("/")
 File.chmod(0700, filename)
 text = File.read(filename)
 new_contents = text.gsub("#import <PureLayout.h>", "#import <PureLayout/PureLayout.h>")
 File.open(filename, "w") {|file| file.puts new_contents }
end
