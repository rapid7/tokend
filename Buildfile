build_name 'tokend'

autoversion.create_tags false
autoversion.search_tags false

cookbook.depends 'tokend' do |tokend|
  tokend.path './cookbook'
end

profile :default do |test|
  test.chef.run_list 'tokend::default'
end
