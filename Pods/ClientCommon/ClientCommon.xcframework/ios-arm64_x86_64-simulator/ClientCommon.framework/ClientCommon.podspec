Pod::Spec.new do |s|
  s.name = 'ClientCommon'
  s.version = '1.1.5'
  s.summary = 'ClientCommon'
  s.license = 'Backbase License'
  s.homepage = 'http://www.backbase.com/home'
  s.author = 'Backbase B.V.'

  s.platform = :ios
  s.ios.deployment_target = '12.0'

  # ――― Source Location ―――――――――――――――――――――――――――――――――――――――――――――――――――――――――― #
  s.source = { :git => "https://stash.backbase.com/projects/MB/repos/client-collection-ios.git", :tag => "1.1.5" }
  s.source_files = '*.swift'

  # ――― Source Code ―――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――― #
  s.vendored_frameworks = 'ClientCommon.xcframework'

  # ――― Dependencies ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――― #
  s.dependency 'Backbase', '>= 7.8.0'
end
